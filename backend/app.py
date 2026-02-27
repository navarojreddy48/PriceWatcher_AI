from flask import Flask, jsonify, request
from apscheduler.schedulers.background import BackgroundScheduler
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, get_jwt_identity, jwt_required, verify_jwt_in_request
from functools import wraps
from datetime import datetime, timedelta
import re
import os
import mysql.connector
from mysql.connector import Error
import requests
from bs4 import BeautifulSoup
from werkzeug.security import check_password_hash, generate_password_hash
from scraper.competitor_scraper import scrape_competitor_file

from config import DB_CONFIG

app = Flask(__name__)
CORS(
    app,
    resources={r"/api/*": {"origins": "*"}},
    allow_headers=["Content-Type", "Authorization"],
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
)
app.config["JWT_SECRET_KEY"] = "super-secret-key"
jwt = JWTManager(app)
scheduler = BackgroundScheduler()
ALLOWED_CATEGORY_LEVELS = {"low", "medium", "high", "premium"}


@app.before_request
def handle_api_preflight():
    if request.method == "OPTIONS" and request.path.startswith("/api/"):
        return "", 200


def get_db_connection():
    return mysql.connector.connect(
        host=DB_CONFIG["host"],
        user=DB_CONFIG["user"],
        password=DB_CONFIG["password"],
        database=DB_CONFIG["database"],
    )


def normalize_category_level(raw_value, default="medium"):
    value = (raw_value or "").strip().lower()
    if value in ALLOWED_CATEGORY_LEVELS:
        return value
    return default


def ensure_database() -> None:
    connection = None
    cursor = None
    try:
        connection = mysql.connector.connect(
            host=DB_CONFIG["host"],
            user=DB_CONFIG["user"],
            password=DB_CONFIG["password"],
        )
        cursor = connection.cursor()
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{DB_CONFIG['database']}`")
        connection.commit()
    except Error as error:
        print(f"Failed to ensure database: {error}")
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


def check_mysql_connection() -> bool:
    try:
        connection = get_db_connection()
        if connection.is_connected():
            print("MySQL Connected Successfully")
            return True
    except Error as error:
        print(f"MySQL connection failed: {error}")
        return False
    finally:
        if "connection" in locals() and connection.is_connected():
            connection.close()


def ensure_dishes_table() -> None:
    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor()
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS dishes (
                id INT PRIMARY KEY AUTO_INCREMENT,
                restaurant_id INT,
                dish_name VARCHAR(255),
                category VARCHAR(255),
                our_price FLOAT,
                competitor_avg FLOAT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_dishes_restaurant
                    FOREIGN KEY (restaurant_id) REFERENCES users(id)
                    ON DELETE CASCADE
            )
            """
        )

        cursor.execute(
            """
            SELECT COUNT(*)
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = %s
              AND TABLE_NAME = 'dishes'
              AND COLUMN_NAME = 'restaurant_id'
            """,
            (DB_CONFIG["database"],),
        )
        has_restaurant_id = cursor.fetchone()[0] > 0
        if not has_restaurant_id:
            cursor.execute("ALTER TABLE dishes ADD COLUMN restaurant_id INT")

        cursor.execute(
            """
            SELECT COUNT(*)
            FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
            WHERE CONSTRAINT_SCHEMA = %s
              AND TABLE_NAME = 'dishes'
              AND CONSTRAINT_NAME = 'fk_dishes_restaurant'
              AND CONSTRAINT_TYPE = 'FOREIGN KEY'
            """,
            (DB_CONFIG["database"],),
        )
        has_foreign_key = cursor.fetchone()[0] > 0
        if not has_foreign_key:
            cursor.execute(
                """
                ALTER TABLE dishes
                ADD CONSTRAINT fk_dishes_restaurant
                FOREIGN KEY (restaurant_id) REFERENCES users(id)
                ON DELETE CASCADE
                """
            )

        connection.commit()
    except Error as error:
        print(f"Failed to ensure dishes table: {error}")
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


def ensure_competitors_table() -> None:
    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor()
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS competitors (
                id INT PRIMARY KEY AUTO_INCREMENT,
                restaurant_id INT,
                name VARCHAR(255),
                mock_file VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_competitors_restaurant
                    FOREIGN KEY (restaurant_id) REFERENCES users(id)
                    ON DELETE CASCADE
            )
            """
        )

        cursor.execute(
            """
            SELECT COUNT(*)
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = %s
              AND TABLE_NAME = 'competitors'
              AND COLUMN_NAME = 'restaurant_id'
            """,
            (DB_CONFIG["database"],),
        )
        has_restaurant_id = cursor.fetchone()[0] > 0
        if not has_restaurant_id:
            cursor.execute("ALTER TABLE competitors ADD COLUMN restaurant_id INT")

        cursor.execute(
            """
            SELECT COUNT(*)
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = %s
              AND TABLE_NAME = 'competitors'
              AND COLUMN_NAME = 'name'
            """,
            (DB_CONFIG["database"],),
        )
        has_name = cursor.fetchone()[0] > 0
        if not has_name:
            cursor.execute("ALTER TABLE competitors ADD COLUMN name VARCHAR(255)")

        cursor.execute(
            """
            SELECT COUNT(*)
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = %s
              AND TABLE_NAME = 'competitors'
              AND COLUMN_NAME = 'mock_file'
            """,
            (DB_CONFIG["database"],),
        )
        has_mock_file = cursor.fetchone()[0] > 0
        if not has_mock_file:
            cursor.execute("ALTER TABLE competitors ADD COLUMN mock_file VARCHAR(255)")

        cursor.execute(
            """
            SELECT COUNT(*)
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = %s
              AND TABLE_NAME = 'competitors'
              AND COLUMN_NAME = 'restaurant_name'
            """,
            (DB_CONFIG["database"],),
        )
        has_restaurant_name = cursor.fetchone()[0] > 0
        if not has_restaurant_name:
            cursor.execute("ALTER TABLE competitors ADD COLUMN restaurant_name VARCHAR(255)")

        cursor.execute(
            """
            SELECT COUNT(*)
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = %s
              AND TABLE_NAME = 'competitors'
              AND COLUMN_NAME = 'platform'
            """,
            (DB_CONFIG["database"],),
        )
        has_platform = cursor.fetchone()[0] > 0
        if not has_platform:
            cursor.execute("ALTER TABLE competitors ADD COLUMN platform VARCHAR(100)")

        cursor.execute(
            """
            SELECT COUNT(*)
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = %s
              AND TABLE_NAME = 'competitors'
              AND COLUMN_NAME = 'website_url'
            """,
            (DB_CONFIG["database"],),
        )
        has_website_url = cursor.fetchone()[0] > 0
        if not has_website_url:
            cursor.execute("ALTER TABLE competitors ADD COLUMN website_url VARCHAR(500)")

        cursor.execute(
            """
            SELECT COUNT(*)
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = %s
              AND TABLE_NAME = 'competitors'
              AND COLUMN_NAME = 'dishes_tracked'
            """,
            (DB_CONFIG["database"],),
        )
        has_dishes_tracked = cursor.fetchone()[0] > 0
        if not has_dishes_tracked:
            cursor.execute("ALTER TABLE competitors ADD COLUMN dishes_tracked INT DEFAULT 0")

        cursor.execute(
            """
            SELECT COUNT(*)
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = %s
              AND TABLE_NAME = 'competitors'
              AND COLUMN_NAME = 'status'
            """,
            (DB_CONFIG["database"],),
        )
        has_status = cursor.fetchone()[0] > 0
        if not has_status:
            cursor.execute("ALTER TABLE competitors ADD COLUMN status VARCHAR(20) DEFAULT 'Active'")

        cursor.execute(
            """
            SELECT COUNT(*)
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = %s
              AND TABLE_NAME = 'competitors'
              AND COLUMN_NAME = 'scraped_title'
            """,
            (DB_CONFIG["database"],),
        )
        has_scraped_title = cursor.fetchone()[0] > 0
        if not has_scraped_title:
            cursor.execute("ALTER TABLE competitors ADD COLUMN scraped_title VARCHAR(500)")

        cursor.execute(
            """
            SELECT COUNT(*)
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = %s
              AND TABLE_NAME = 'competitors'
              AND COLUMN_NAME = 'last_updated'
            """,
            (DB_CONFIG["database"],),
        )
        has_last_updated = cursor.fetchone()[0] > 0
        if not has_last_updated:
            cursor.execute("ALTER TABLE competitors ADD COLUMN last_updated DATETIME")

        cursor.execute(
            """
            SELECT COUNT(*)
            FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
            WHERE CONSTRAINT_SCHEMA = %s
              AND TABLE_NAME = 'competitors'
              AND CONSTRAINT_NAME = 'fk_competitors_restaurant'
              AND CONSTRAINT_TYPE = 'FOREIGN KEY'
            """,
            (DB_CONFIG["database"],),
        )
        has_fk = cursor.fetchone()[0] > 0
        if not has_fk:
            cursor.execute(
                """
                ALTER TABLE competitors
                ADD CONSTRAINT fk_competitors_restaurant
                FOREIGN KEY (restaurant_id) REFERENCES users(id)
                ON DELETE CASCADE
                """
            )

        connection.commit()
    except Error as error:
        print(f"Failed to ensure competitors table: {error}")
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


def ensure_alerts_table() -> None:
    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor()
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS alerts (
                id INT PRIMARY KEY AUTO_INCREMENT,
                restaurant_id INT,
                dish_name VARCHAR(255),
                old_price FLOAT,
                new_price FLOAT,
                message VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_read BOOLEAN DEFAULT FALSE,
                CONSTRAINT fk_alerts_restaurant
                    FOREIGN KEY (restaurant_id) REFERENCES users(id)
                    ON DELETE CASCADE
            )
            """
        )

        cursor.execute(
            """
            SELECT COUNT(*)
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = %s
              AND TABLE_NAME = 'alerts'
              AND COLUMN_NAME = 'restaurant_id'
            """,
            (DB_CONFIG["database"],),
        )
        has_restaurant_id = cursor.fetchone()[0] > 0
        if not has_restaurant_id:
            cursor.execute("ALTER TABLE alerts ADD COLUMN restaurant_id INT")

        cursor.execute(
            """
            SELECT COUNT(*)
            FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
            WHERE CONSTRAINT_SCHEMA = %s
              AND TABLE_NAME = 'alerts'
              AND CONSTRAINT_NAME = 'fk_alerts_restaurant'
              AND CONSTRAINT_TYPE = 'FOREIGN KEY'
            """,
            (DB_CONFIG["database"],),
        )
        has_fk = cursor.fetchone()[0] > 0
        if not has_fk:
            cursor.execute(
                """
                ALTER TABLE alerts
                ADD CONSTRAINT fk_alerts_restaurant
                FOREIGN KEY (restaurant_id) REFERENCES users(id)
                ON DELETE CASCADE
                """
            )

        connection.commit()
    except Error as error:
        print(f"Failed to ensure alerts table: {error}")
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


def ensure_price_history_table() -> None:
    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor()
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS dish_price_history (
                id INT PRIMARY KEY AUTO_INCREMENT,
                restaurant_id INT NOT NULL,
                dish_id INT,
                dish_name VARCHAR(255),
                metric VARCHAR(32) NOT NULL,
                price_value FLOAT,
                recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_price_history_restaurant_metric_time (restaurant_id, metric, recorded_at),
                INDEX idx_price_history_dish_metric_time (dish_id, metric, recorded_at)
            )
            """
        )
        connection.commit()
    except Error as error:
        print(f"Failed to ensure price history table: {error}")
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


def log_price_history(connection, restaurant_id, dish_id, dish_name, metric, price_value):
    if not connection or not restaurant_id or not metric:
        return

    history_cursor = None
    try:
        parsed_price = float(price_value)
    except (TypeError, ValueError):
        return

    try:
        history_cursor = connection.cursor()
        history_cursor.execute(
            """
            INSERT INTO dish_price_history (restaurant_id, dish_id, dish_name, metric, price_value)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (restaurant_id, dish_id, dish_name, metric, parsed_price),
        )
    except Error as error:
        print(f"Failed to log price history: {error}")
    finally:
        if history_cursor:
            history_cursor.close()


def ensure_users_table() -> None:
    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor()
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INT PRIMARY KEY AUTO_INCREMENT,
                restaurant_id INT,
                restaurant_name VARCHAR(255),
                owner_name VARCHAR(255),
                email VARCHAR(255) UNIQUE,
                password VARCHAR(255),
                category_level VARCHAR(20) DEFAULT 'medium',
                role VARCHAR(20) DEFAULT 'staff',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_users_restaurant
                    FOREIGN KEY (restaurant_id) REFERENCES users(id)
                    ON DELETE CASCADE
            )
            """
        )

        cursor.execute(
            """
            SELECT COUNT(*)
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = %s
              AND TABLE_NAME = 'users'
              AND COLUMN_NAME = 'role'
            """,
            (DB_CONFIG["database"],),
        )
        has_role_column = cursor.fetchone()[0] > 0
        if not has_role_column:
            cursor.execute("ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'staff'")

        cursor.execute(
            """
            SELECT COUNT(*)
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = %s
              AND TABLE_NAME = 'users'
              AND COLUMN_NAME = 'restaurant_id'
            """,
            (DB_CONFIG["database"],),
        )
        has_restaurant_id_column = cursor.fetchone()[0] > 0
        if not has_restaurant_id_column:
            cursor.execute("ALTER TABLE users ADD COLUMN restaurant_id INT")

        cursor.execute(
            """
            SELECT COUNT(*)
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = %s
              AND TABLE_NAME = 'users'
              AND COLUMN_NAME = 'category_level'
            """,
            (DB_CONFIG["database"],),
        )
        has_category_level_column = cursor.fetchone()[0] > 0
        if not has_category_level_column:
            cursor.execute("ALTER TABLE users ADD COLUMN category_level VARCHAR(20) DEFAULT 'medium'")

        cursor.execute(
            """
            SELECT COUNT(*)
            FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
            WHERE CONSTRAINT_SCHEMA = %s
              AND TABLE_NAME = 'users'
              AND CONSTRAINT_NAME = 'fk_users_restaurant'
              AND CONSTRAINT_TYPE = 'FOREIGN KEY'
            """,
            (DB_CONFIG["database"],),
        )
        has_users_restaurant_fk = cursor.fetchone()[0] > 0
        if not has_users_restaurant_fk:
            cursor.execute(
                """
                ALTER TABLE users
                ADD CONSTRAINT fk_users_restaurant
                FOREIGN KEY (restaurant_id) REFERENCES users(id)
                ON DELETE CASCADE
                """
            )

        cursor.execute("UPDATE users SET role = 'staff' WHERE role IS NULL OR role = ''")
        cursor.execute(
            """
            UPDATE users
            SET category_level = 'medium'
            WHERE category_level IS NULL
               OR category_level = ''
               OR LOWER(category_level) NOT IN ('low', 'medium', 'high', 'premium')
            """
        )

        cursor.execute("SELECT COUNT(*) FROM users WHERE role = 'admin'")
        admin_count = cursor.fetchone()[0]
        if admin_count == 0:
            cursor.execute("SELECT id FROM users ORDER BY id ASC LIMIT 1")
            first_user = cursor.fetchone()
            if first_user:
                cursor.execute("UPDATE users SET role = 'admin' WHERE id = %s", (first_user[0],))

        cursor.execute("UPDATE users SET restaurant_id = id WHERE restaurant_id IS NULL")

        cursor.execute("UPDATE users SET restaurant_id = id WHERE role = 'admin'")

        cursor.execute(
            """
            UPDATE users staff
            JOIN users admin
              ON admin.role = 'admin'
             AND staff.restaurant_name = admin.restaurant_name
            SET staff.restaurant_id = admin.id
            WHERE staff.role = 'staff'
            """
        )

        connection.commit()
    except Error as error:
        print(f"Failed to ensure users table: {error}")
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


@app.route("/api/test", methods=["GET"])
def test_backend():
    return jsonify({"message": "Backend working successfully"})


def get_user_by_id(user_id: str):
    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        cursor.execute(
            """
            SELECT id, restaurant_id, restaurant_name, owner_name, email, category_level, role
            FROM users
            WHERE id = %s
            """,
            (user_id,),
        )
        return cursor.fetchone()
    except Error:
        return None
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


def role_required(required_role: str):
    def decorator(route_handler):
        @wraps(route_handler)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            current_user_id = get_jwt_identity()
            current_user = get_user_by_id(current_user_id)

            if not current_user:
                return jsonify({"error": "User not found"}), 404

            if current_user.get("role") != required_role:
                return jsonify({"error": "Unauthorized"}), 403

            return route_handler(*args, **kwargs)

        return wrapper

    return decorator


def scrape_competitor_website(website_url: str):
    response = requests.get(
        website_url,
        timeout=12,
        headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        },
    )
    response.raise_for_status()

    soup = BeautifulSoup(response.text, "html.parser")
    title = soup.title.string.strip() if soup.title and soup.title.string else "Unknown title"
    page_text = soup.get_text(" ", strip=True)

    price_tokens = re.findall(r"(?:₹|Rs\.?|INR)\s*\d+(?:\.\d{1,2})?", page_text, flags=re.IGNORECASE)
    dishes_tracked = len(set(price_tokens))

    return {
        "title": title,
        "dishes_tracked": dishes_tracked,
    }


def auto_scrape_all():
    connection = None
    competitors_cursor = None
    dishes_cursor = None
    try:
        connection = get_db_connection()
        competitors_cursor = connection.cursor(dictionary=True)
        competitors_cursor.execute(
            """
            SELECT id, restaurant_id, mock_file
            FROM competitors
            """
        )
        competitors = competitors_cursor.fetchall()

        for competitor in competitors:
            try:
                mock_file_name = competitor.get("mock_file") or ""
                if not mock_file_name:
                    continue

                scrape_result = scrape_competitor_file(mock_file_name)
                scraped_data = scrape_result.get("data", []) if isinstance(scrape_result, dict) else []

                apply_scraped_prices(connection, competitor.get("restaurant_id"), scraped_data)
            except Exception as error:
                print(f"Auto scrape failed for competitor {competitor.get('id')}: {error}")
                continue

        connection.commit()
        print("Auto scraping completed")
    except Error as error:
        print(f"Auto scraping failed: {error}")
    finally:
        if competitors_cursor:
            competitors_cursor.close()
        if connection and connection.is_connected():
            connection.close()


def apply_scraped_prices(connection, restaurant_id, scraped_data):
    if not restaurant_id:
        return 0

    lookup_cursor = None
    update_cursor = None
    alert_cursor = None
    updated_dishes = 0

    try:
        lookup_cursor = connection.cursor(dictionary=True)
        update_cursor = connection.cursor()
        alert_cursor = connection.cursor()

        for item in scraped_data:
            dish_name = item.get("dish_name")
            new_price = item.get("price")

            if dish_name is None or new_price is None:
                continue

            lookup_cursor.execute(
                """
                SELECT id, competitor_avg
                FROM dishes
                WHERE dish_name = %s AND restaurant_id = %s
                LIMIT 1
                """,
                (dish_name, restaurant_id),
            )
            existing_dish = lookup_cursor.fetchone()

            if not existing_dish:
                continue

            old_price = existing_dish.get("competitor_avg")

            if old_price is not None and float(new_price) < float(old_price):
                message = f"Competitor dropped price for {dish_name} from {old_price} to {new_price}"
                alert_cursor.execute(
                    """
                    INSERT INTO alerts (restaurant_id, dish_name, old_price, new_price, message)
                    VALUES (%s, %s, %s, %s, %s)
                    """,
                    (restaurant_id, dish_name, old_price, new_price, message),
                )

            update_cursor.execute(
                """
                UPDATE dishes
                SET competitor_avg = %s
                WHERE dish_name = %s AND restaurant_id = %s
                """,
                (new_price, dish_name, restaurant_id),
            )

            if update_cursor.rowcount > 0:
                log_price_history(
                    connection,
                    restaurant_id,
                    existing_dish.get("id"),
                    dish_name,
                    "competitor_avg",
                    new_price,
                )
                updated_dishes += update_cursor.rowcount
    finally:
        if lookup_cursor:
            lookup_cursor.close()
        if update_cursor:
            update_cursor.close()
        if alert_cursor:
            alert_cursor.close()

    return updated_dishes


def start_scheduler() -> None:
    try:
        scheduler.add_job(
            func=auto_scrape_all,
            trigger="interval",
            minutes=5,
            id="auto_scrape_all_job",
            replace_existing=True,
        )

        if not scheduler.running:
            scheduler.start()
    except Exception as error:
        print(f"Failed to start scheduler: {error}")


@app.route("/api/register", methods=["POST"])
def register_user():
    payload = request.get_json(silent=True) or {}
    restaurant_name = payload.get("restaurant_name")
    owner_name = payload.get("owner_name")
    email = payload.get("email")
    password = payload.get("password")
    requested_category_level = normalize_category_level(payload.get("category_level"))

    if not owner_name or not email or not password:
        return jsonify({"error": "owner_name, email, and password are required"}), 400

    current_admin_user = None
    auth_header = request.headers.get("Authorization")

    if auth_header:
        try:
            verify_jwt_in_request()
            current_user_id = get_jwt_identity()
            current_admin_user = get_user_by_id(current_user_id)
            if not current_admin_user:
                return jsonify({"error": "User not found"}), 404
            if current_admin_user.get("role") != "admin":
                return jsonify({"error": "Unauthorized"}), 403
        except Exception:
            return jsonify({"error": "Invalid token"}), 401

    if not current_admin_user and not restaurant_name:
        return jsonify({"error": "restaurant_name is required"}), 400

    connection = None
    check_cursor = None
    insert_cursor = None
    try:
        connection = get_db_connection()
        check_cursor = connection.cursor(dictionary=True)
        check_cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
        existing_user = check_cursor.fetchone()

        if existing_user:
            return jsonify({"error": "Email already exists"}), 409

        if current_admin_user:
            assigned_role = "staff"
            assigned_restaurant_id = current_admin_user.get("restaurant_id") or current_admin_user["id"]
            effective_restaurant_name = current_admin_user.get("restaurant_name")
            assigned_category_level = normalize_category_level(current_admin_user.get("category_level"))
        else:
            assigned_role = "admin"
            assigned_restaurant_id = None
            effective_restaurant_name = restaurant_name
            assigned_category_level = requested_category_level

        hashed_password = generate_password_hash(password)

        insert_cursor = connection.cursor()
        insert_cursor.execute(
            """
            INSERT INTO users (restaurant_id, restaurant_name, owner_name, email, password, category_level, role)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """,
            (
                assigned_restaurant_id,
                effective_restaurant_name,
                owner_name,
                email,
                hashed_password,
                assigned_category_level,
                assigned_role,
            ),
        )

        new_user_id = insert_cursor.lastrowid
        if assigned_role == "admin":
            insert_cursor.execute(
                "UPDATE users SET restaurant_id = %s WHERE id = %s",
                (new_user_id, new_user_id),
            )

        connection.commit()

        return jsonify({"message": "User registered successfully"}), 201
    except Error as error:
        return jsonify({"error": f"Failed to register user: {error}"}), 500
    finally:
        if check_cursor:
            check_cursor.close()
        if insert_cursor:
            insert_cursor.close()
        if connection and connection.is_connected():
            connection.close()


@app.route("/api/create-staff", methods=["POST"])
@jwt_required()
@role_required("admin")
def create_staff_user():
    current_user_id = get_jwt_identity()
    admin_user = get_user_by_id(current_user_id)

    if not admin_user:
        return jsonify({"error": "User not found"}), 404

    payload = request.get_json(silent=True) or {}
    owner_name = payload.get("owner_name")
    email = payload.get("email")
    password = payload.get("password")

    if not owner_name or not email or not password:
        return jsonify({"error": "owner_name, email, and password are required"}), 400

    connection = None
    check_cursor = None
    insert_cursor = None
    try:
        connection = get_db_connection()
        check_cursor = connection.cursor(dictionary=True)
        check_cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
        existing_user = check_cursor.fetchone()

        if existing_user:
            return jsonify({"error": "Email already exists"}), 409

        hashed_password = generate_password_hash(password)
        restaurant_id = admin_user.get("restaurant_id") or admin_user.get("id")

        insert_cursor = connection.cursor()
        insert_cursor.execute(
            """
            INSERT INTO users (restaurant_id, restaurant_name, owner_name, email, password, category_level, role)
            VALUES (%s, %s, %s, %s, %s, %s, 'staff')
            """,
            (
                restaurant_id,
                admin_user.get("restaurant_name"),
                owner_name,
                email,
                hashed_password,
                normalize_category_level(admin_user.get("category_level")),
            ),
        )
        connection.commit()

        return jsonify({"message": "Staff account created successfully"}), 201
    except Error as error:
        return jsonify({"error": f"Failed to create staff user: {error}"}), 500
    finally:
        if check_cursor:
            check_cursor.close()
        if insert_cursor:
            insert_cursor.close()
        if connection and connection.is_connected():
            connection.close()


@app.route("/api/staff", methods=["GET"])
@jwt_required()
@role_required("admin")
def get_staff_users():
    current_user_id = get_jwt_identity()
    admin_user = get_user_by_id(current_user_id)

    if not admin_user:
        return jsonify({"error": "User not found"}), 404

    admin_restaurant_id = admin_user.get("restaurant_id") or admin_user.get("id")

    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        cursor.execute(
            """
            SELECT id, restaurant_id, restaurant_name, owner_name, email, category_level, role, created_at
            FROM users
            WHERE restaurant_id = %s AND role = 'staff'
            ORDER BY id DESC
            """,
            (admin_restaurant_id,),
        )
        staff_users = cursor.fetchall()
        return jsonify(staff_users), 200
    except Error as error:
        return jsonify({"error": f"Failed to fetch staff users: {error}"}), 500
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


@app.route("/api/staff/<int:staff_id>", methods=["DELETE"])
@jwt_required()
@role_required("admin")
def delete_staff_user(staff_id: int):
    current_user_id = get_jwt_identity()
    admin_user = get_user_by_id(current_user_id)

    if not admin_user:
        return jsonify({"error": "User not found"}), 404

    admin_restaurant_id = admin_user.get("restaurant_id") or admin_user.get("id")

    connection = None
    check_cursor = None
    delete_cursor = None
    try:
        connection = get_db_connection()
        check_cursor = connection.cursor(dictionary=True)
        check_cursor.execute(
            """
            SELECT id, restaurant_id, role
            FROM users
            WHERE id = %s
            """,
            (staff_id,),
        )
        staff_user = check_cursor.fetchone()

        if not staff_user:
            return jsonify({"error": "Staff user not found"}), 404

        if staff_user.get("role") != "staff":
            return jsonify({"error": "Only staff users can be deleted"}), 400

        if str(staff_user.get("restaurant_id")) != str(admin_restaurant_id):
            return jsonify({"error": "Unauthorized"}), 403

        delete_cursor = connection.cursor()
        delete_cursor.execute("DELETE FROM users WHERE id = %s", (staff_id,))
        connection.commit()

        if delete_cursor.rowcount == 0:
            return jsonify({"error": "Staff user not found"}), 404

        return jsonify({"message": "Staff account deleted successfully"}), 200
    except Error as error:
        return jsonify({"error": f"Failed to delete staff user: {error}"}), 500
    finally:
        if check_cursor:
            check_cursor.close()
        if delete_cursor:
            delete_cursor.close()
        if connection and connection.is_connected():
            connection.close()


@app.route("/api/login", methods=["POST"])
def login_user():
    payload = request.get_json(silent=True) or {}
    email = (payload.get("email") or "").strip().lower()
    password = payload.get("password")

    if not email or not password:
        return jsonify({"error": "email and password are required"}), 400

    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        cursor.execute(
            """
            SELECT id, restaurant_id, restaurant_name, owner_name, email, password, category_level, role
            FROM users
            WHERE LOWER(TRIM(email)) = %s
            """,
            (email,),
        )
        user = cursor.fetchone()

        if not user:
            return jsonify({"error": "Invalid email or password"}), 401

        stored_password = user.get("password") or ""
        is_valid_password = False

        if stored_password.startswith(("pbkdf2:", "scrypt:")):
            is_valid_password = check_password_hash(stored_password, password)
        else:
            is_valid_password = stored_password == password
            if is_valid_password:
                upgraded_password = generate_password_hash(password)
                cursor.execute(
                    "UPDATE users SET password = %s WHERE id = %s",
                    (upgraded_password, user["id"]),
                )
                connection.commit()

        if not is_valid_password:
            return jsonify({"error": "Invalid email or password"}), 401

        access_token = create_access_token(identity=str(user["id"]))

        return (
            jsonify(
                {
                    "access_token": access_token,
                    "user": {
                        "id": user["id"],
                        "restaurant_id": user["restaurant_id"],
                        "restaurant_name": user["restaurant_name"],
                        "owner_name": user["owner_name"],
                        "email": user["email"],
                        "category_level": user["category_level"],
                        "role": user["role"],
                    },
                }
            ),
            200,
        )
    except Error as error:
        return jsonify({"error": f"Failed to login user: {error}"}), 500
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


@app.route("/api/competitors", methods=["GET"])
@jwt_required()
def get_competitors():
    current_user_id = get_jwt_identity()
    current_user = get_user_by_id(current_user_id)

    if not current_user:
        return jsonify({"error": "User not found"}), 404

    restaurant_id = current_user.get("restaurant_id") or current_user.get("id")

    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        cursor.execute(
            """
            SELECT id, restaurant_id, restaurant_name, platform, website_url,
                   dishes_tracked, status, scraped_title, last_updated, created_at
            FROM competitors
            WHERE restaurant_id = %s
            ORDER BY id DESC
            """,
            (restaurant_id,),
        )
        competitors = cursor.fetchall()
        return jsonify(competitors), 200
    except Error as error:
        return jsonify({"error": f"Failed to fetch competitors: {error}"}), 500
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


@app.route("/api/competitors", methods=["POST"])
@jwt_required()
@role_required("admin")
def create_competitor():
    current_user_id = get_jwt_identity()
    current_user = get_user_by_id(current_user_id)

    if not current_user:
        return jsonify({"error": "User not found"}), 404

    payload = request.get_json(silent=True) or {}
    restaurant_name = payload.get("restaurant_name")
    platform = payload.get("platform")
    website_url = payload.get("website_url")
    mock_file = (payload.get("mock_file") or "").strip() or None
    status = payload.get("status") or "Active"

    if not restaurant_name or not platform or not website_url:
        return jsonify({"error": "restaurant_name, platform, and website_url are required"}), 400

    restaurant_id = current_user.get("restaurant_id") or current_user.get("id")

    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor()
        cursor.execute(
            """
            INSERT INTO competitors (
                restaurant_id,
                restaurant_name,
                platform,
                website_url,
                status,
                last_updated,
                mock_file
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """,
            (restaurant_id, restaurant_name, platform, website_url, status, datetime.utcnow(), mock_file),
        )
        connection.commit()
        return jsonify({"message": "Competitor added successfully", "id": cursor.lastrowid}), 201
    except Error as error:
        return jsonify({"error": f"Failed to add competitor: {error}"}), 500
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


@app.route("/api/competitors/<int:competitor_id>", methods=["PUT"])
@jwt_required()
@role_required("admin")
def update_competitor(competitor_id: int):
    current_user_id = get_jwt_identity()
    current_user = get_user_by_id(current_user_id)

    if not current_user:
        return jsonify({"error": "User not found"}), 404

    restaurant_id = current_user.get("restaurant_id") or current_user.get("id")
    payload = request.get_json(silent=True) or {}
    status = payload.get("status")

    if not status:
        return jsonify({"error": "status is required"}), 400

    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor()
        cursor.execute(
            """
            UPDATE competitors
            SET status = %s, last_updated = %s
            WHERE id = %s AND restaurant_id = %s
            """,
            (status, datetime.utcnow(), competitor_id, restaurant_id),
        )
        connection.commit()

        if cursor.rowcount == 0:
            return jsonify({"error": "Competitor not found or unauthorized"}), 404

        return jsonify({"message": "Competitor updated successfully"}), 200
    except Error as error:
        return jsonify({"error": f"Failed to update competitor: {error}"}), 500
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


@app.route("/api/competitors/<int:competitor_id>", methods=["DELETE"])
@jwt_required()
@role_required("admin")
def delete_competitor(competitor_id: int):
    current_user_id = get_jwt_identity()
    current_user = get_user_by_id(current_user_id)

    if not current_user:
        return jsonify({"error": "User not found"}), 404

    restaurant_id = current_user.get("restaurant_id") or current_user.get("id")

    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor()
        cursor.execute(
            "DELETE FROM competitors WHERE id = %s AND restaurant_id = %s",
            (competitor_id, restaurant_id),
        )
        connection.commit()

        if cursor.rowcount == 0:
            return jsonify({"error": "Competitor not found or unauthorized"}), 404

        return jsonify({"message": "Competitor deleted successfully"}), 200
    except Error as error:
        return jsonify({"error": f"Failed to delete competitor: {error}"}), 500
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


@app.route("/api/competitors/<int:competitor_id>/scrape", methods=["POST"])
@jwt_required()
@role_required("admin")
def scrape_competitor(competitor_id: int):
    current_user_id = get_jwt_identity()
    current_user = get_user_by_id(current_user_id)

    if not current_user:
        return jsonify({"error": "User not found"}), 404

    restaurant_id = current_user.get("restaurant_id") or current_user.get("id")

    connection = None
    read_cursor = None
    write_cursor = None
    try:
        connection = get_db_connection()
        read_cursor = connection.cursor(dictionary=True)
        read_cursor.execute(
            """
            SELECT id, website_url
            FROM competitors
            WHERE id = %s AND restaurant_id = %s
            """,
            (competitor_id, restaurant_id),
        )
        competitor = read_cursor.fetchone()

        if not competitor:
            return jsonify({"error": "Competitor not found or unauthorized"}), 404

        scrape_result = scrape_competitor_website(competitor["website_url"])

        write_cursor = connection.cursor()
        write_cursor.execute(
            """
            UPDATE competitors
            SET dishes_tracked = %s,
                scraped_title = %s,
                last_updated = %s,
                status = 'Active'
            WHERE id = %s AND restaurant_id = %s
            """,
            (
                scrape_result["dishes_tracked"],
                scrape_result["title"],
                datetime.utcnow(),
                competitor_id,
                restaurant_id,
            ),
        )
        connection.commit()

        return (
            jsonify(
                {
                    "message": "Competitor scraped successfully",
                    "title": scrape_result["title"],
                    "dishes_tracked": scrape_result["dishes_tracked"],
                }
            ),
            200,
        )
    except requests.RequestException as error:
        return jsonify({"error": f"Failed to scrape competitor website: {error}"}), 502
    except Error as error:
        return jsonify({"error": f"Failed to scrape competitor: {error}"}), 500
    finally:
        if read_cursor:
            read_cursor.close()
        if write_cursor:
            write_cursor.close()
        if connection and connection.is_connected():
            connection.close()


@app.route("/api/scrape/<int:competitor_id>", methods=["POST"])
@jwt_required()
def scrape_competitor_data(competitor_id: int):
    current_user_id = get_jwt_identity()
    current_user = get_user_by_id(current_user_id)

    if not current_user:
        return jsonify({"error": "User not found"}), 404

    restaurant_id = current_user.get("restaurant_id") or current_user.get("id")

    connection = None
    competitor_cursor = None
    try:
        connection = get_db_connection()
        competitor_cursor = connection.cursor(dictionary=True)
        competitor_cursor.execute(
            """
            SELECT id, restaurant_id, mock_file
            FROM competitors
            WHERE id = %s AND restaurant_id = %s
            """,
            (competitor_id, restaurant_id),
        )
        competitor = competitor_cursor.fetchone()

        if not competitor:
            return jsonify({"error": "Unauthorized"}), 403

        scrape_result = scrape_competitor_file(competitor.get("mock_file"))
        scraped_data = scrape_result.get("data", []) if isinstance(scrape_result, dict) else []

        updated_dishes = apply_scraped_prices(connection, restaurant_id, scraped_data)

        connection.commit()

        return jsonify({"message": "Scraping completed", "updated": updated_dishes}), 200
    except Error as error:
        return jsonify({"error": f"Failed to scrape competitor data: {error}"}), 500
    finally:
        if competitor_cursor:
            competitor_cursor.close()
        if connection and connection.is_connected():
            connection.close()


@app.route("/api/alerts", methods=["GET"])
@jwt_required()
def get_alerts():
    current_user_id = get_jwt_identity()
    current_user = get_user_by_id(current_user_id)

    if not current_user:
        return jsonify({"error": "User not found"}), 404

    restaurant_id = current_user.get("restaurant_id") or current_user.get("id")

    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        cursor.execute(
            """
            SELECT id, restaurant_id, dish_name, old_price, new_price, message, created_at, is_read
            FROM alerts
            WHERE restaurant_id = %s
            ORDER BY created_at DESC
            """,
            (restaurant_id,),
        )
        alerts = cursor.fetchall()
        return jsonify(alerts), 200
    except Error as error:
        return jsonify({"error": f"Failed to fetch alerts: {error}"}), 500
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


@app.route("/api/alerts", methods=["OPTIONS"])
def alerts_options():
    return "", 200


@app.route("/api/alerts/<int:alert_id>/read", methods=["PUT"])
@jwt_required()
def mark_alert_as_read(alert_id: int):
    current_user_id = get_jwt_identity()
    current_user = get_user_by_id(current_user_id)

    if not current_user:
        return jsonify({"error": "User not found"}), 404

    restaurant_id = current_user.get("restaurant_id") or current_user.get("id")

    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor()
        cursor.execute(
            """
            UPDATE alerts
            SET is_read = TRUE
            WHERE id = %s AND restaurant_id = %s
            """,
            (alert_id, restaurant_id),
        )
        connection.commit()

        if cursor.rowcount == 0:
            return jsonify({"error": "Alert not found or unauthorized"}), 404

        return jsonify({"message": "Alert marked as read"}), 200
    except Error as error:
        return jsonify({"error": f"Failed to mark alert as read: {error}"}), 500
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


@app.route("/api/alerts/<int:alert_id>/read", methods=["OPTIONS"])
def alert_read_options(alert_id: int):
    return "", 200


@app.route("/api/protected", methods=["GET"])
@jwt_required()
def protected_route():
    current_user_id = get_jwt_identity()
    return jsonify({"message": "Access granted", "user_id": current_user_id}), 200


@app.route("/api/restaurant-profile", methods=["PUT"])
@jwt_required()
@role_required("admin")
def update_restaurant_profile():
    current_user_id = get_jwt_identity()
    current_user = get_user_by_id(current_user_id)

    if not current_user:
        return jsonify({"error": "User not found"}), 404

    restaurant_id = current_user.get("restaurant_id") or current_user.get("id")
    payload = request.get_json(silent=True) or {}
    restaurant_name = (payload.get("restaurant_name") or "").strip()
    owner_name = (payload.get("owner_name") or "").strip()
    email = (payload.get("email") or "").strip().lower()
    category_level = normalize_category_level(payload.get("category_level"), default=None)

    if not restaurant_name or not owner_name or not email:
        return jsonify({"error": "restaurant_name, owner_name, and email are required"}), 400

    if not category_level:
        return jsonify({"error": "category_level must be one of low, medium, high, premium"}), 400

    connection = None
    read_cursor = None
    write_cursor = None
    try:
        connection = get_db_connection()
        read_cursor = connection.cursor(dictionary=True)
        read_cursor.execute(
            """
            SELECT id
            FROM users
            WHERE LOWER(TRIM(email)) = %s AND id <> %s
            LIMIT 1
            """,
            (email, current_user_id),
        )
        email_owner = read_cursor.fetchone()

        if email_owner:
            return jsonify({"error": "Email already exists"}), 409

        write_cursor = connection.cursor()
        write_cursor.execute(
            """
            UPDATE users
            SET restaurant_name = %s,
                category_level = %s
            WHERE restaurant_id = %s
            """,
            (restaurant_name, category_level, restaurant_id),
        )

        write_cursor.execute(
            """
            UPDATE users
            SET owner_name = %s,
                email = %s,
                category_level = %s
            WHERE id = %s
            """,
            (owner_name, email, category_level, current_user_id),
        )
        connection.commit()

        refreshed_user = get_user_by_id(str(current_user_id))
        return jsonify({"message": "Restaurant profile updated", "user": refreshed_user}), 200
    except Error as error:
        return jsonify({"error": f"Failed to update restaurant profile: {error}"}), 500
    finally:
        if read_cursor:
            read_cursor.close()
        if write_cursor:
            write_cursor.close()
        if connection and connection.is_connected():
            connection.close()


@app.route("/api/dishes", methods=["GET"])
@jwt_required()
def get_dishes():
    current_user_id = get_jwt_identity()
    current_user = get_user_by_id(current_user_id)

    if not current_user:
        return jsonify({"error": "User not found"}), 404

    current_restaurant_id = current_user.get("restaurant_id") or current_user.get("id")

    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        cursor.execute(
            """
            SELECT id, restaurant_id, dish_name, category, our_price, competitor_avg, created_at
            FROM dishes
            WHERE restaurant_id = %s
            ORDER BY id DESC
            """,
            (current_restaurant_id,),
        )
        dishes = cursor.fetchall()
        return jsonify(dishes), 200
    except Error as error:
        return jsonify({"error": f"Failed to fetch dishes: {error}"}), 500
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


@app.route("/api/dishes", methods=["POST"])
@jwt_required()
def create_dish():
    current_user_id = get_jwt_identity()
    current_user = get_user_by_id(current_user_id)

    if not current_user:
        return jsonify({"error": "User not found"}), 404

    if current_user.get("role") != "admin":
        return jsonify({"error": "Unauthorized"}), 403

    current_restaurant_id = current_user.get("restaurant_id") or current_user.get("id")

    payload = request.get_json(silent=True) or {}
    dish_name = payload.get("dish_name")
    category = payload.get("category")
    our_price = payload.get("our_price")
    competitor_avg = payload.get("competitor_avg")

    if dish_name is None or category is None or our_price is None or competitor_avg is None:
        return jsonify({"error": "dish_name, category, our_price, and competitor_avg are required"}), 400

    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor()
        cursor.execute(
            """
            INSERT INTO dishes (restaurant_id, dish_name, category, our_price, competitor_avg)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (current_restaurant_id, dish_name, category, our_price, competitor_avg),
        )
        created_dish_id = cursor.lastrowid
        log_price_history(
            connection,
            current_restaurant_id,
            created_dish_id,
            dish_name,
            "our_price",
            our_price,
        )
        log_price_history(
            connection,
            current_restaurant_id,
            created_dish_id,
            dish_name,
            "competitor_avg",
            competitor_avg,
        )
        connection.commit()
        return jsonify({"message": "Dish created successfully", "id": created_dish_id}), 201
    except Error as error:
        return jsonify({"error": f"Failed to create dish: {error}"}), 500
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()


@app.route("/api/dishes/<int:dish_id>", methods=["PUT"])
@jwt_required()
def update_dish(dish_id: int):
    current_user_id = get_jwt_identity()
    current_user = get_user_by_id(current_user_id)

    if not current_user:
        return jsonify({"error": "User not found"}), 404

    if current_user.get("role") != "admin":
        return jsonify({"error": "Unauthorized"}), 403

    current_restaurant_id = current_user.get("restaurant_id") or current_user.get("id")

    payload = request.get_json(silent=True) or {}
    dish_name = payload.get("dish_name")
    category = payload.get("category")
    our_price = payload.get("our_price")
    competitor_avg = payload.get("competitor_avg")

    if dish_name is None or category is None or our_price is None or competitor_avg is None:
        return jsonify({"error": "dish_name, category, our_price, and competitor_avg are required"}), 400

    connection = None
    owner_cursor = None
    update_cursor = None
    try:
        connection = get_db_connection()
        owner_cursor = connection.cursor(dictionary=True)
        owner_cursor.execute(
            "SELECT id, restaurant_id FROM dishes WHERE id = %s",
            (dish_id,),
        )
        dish = owner_cursor.fetchone()

        if not dish:
            return jsonify({"error": "Dish not found"}), 404

        if str(dish["restaurant_id"]) != str(current_restaurant_id):
            return jsonify({"error": "Unauthorized"}), 403

        update_cursor = connection.cursor()
        update_cursor.execute(
            """
            UPDATE dishes
            SET dish_name = %s, category = %s, our_price = %s, competitor_avg = %s
            WHERE id = %s AND restaurant_id = %s
            """,
            (dish_name, category, our_price, competitor_avg, dish_id, current_restaurant_id),
        )
        connection.commit()

        if update_cursor.rowcount == 0:
            return jsonify({"error": "Unauthorized"}), 403

        log_price_history(
            connection,
            current_restaurant_id,
            dish.get("id"),
            dish_name,
            "our_price",
            our_price,
        )
        log_price_history(
            connection,
            current_restaurant_id,
            dish.get("id"),
            dish_name,
            "competitor_avg",
            competitor_avg,
        )

        connection.commit()

        return jsonify({"message": "Dish updated successfully"}), 200
    except Error as error:
        return jsonify({"error": f"Failed to update dish: {error}"}), 500
    finally:
        if owner_cursor:
            owner_cursor.close()
        if update_cursor:
            update_cursor.close()
        if connection and connection.is_connected():
            connection.close()


@app.route("/api/dishes/<int:dish_id>", methods=["DELETE"])
@jwt_required()
def delete_dish(dish_id: int):
    current_user_id = get_jwt_identity()
    current_user = get_user_by_id(current_user_id)

    if not current_user:
        return jsonify({"error": "User not found"}), 404

    if current_user.get("role") != "admin":
        return jsonify({"error": "Unauthorized"}), 403

    current_restaurant_id = current_user.get("restaurant_id") or current_user.get("id")

    connection = None
    owner_cursor = None
    delete_cursor = None
    try:
        connection = get_db_connection()
        owner_cursor = connection.cursor(dictionary=True)
        owner_cursor.execute(
            "SELECT restaurant_id FROM dishes WHERE id = %s",
            (dish_id,),
        )
        dish = owner_cursor.fetchone()

        if not dish:
            return jsonify({"error": "Dish not found"}), 404

        if str(dish["restaurant_id"]) != str(current_restaurant_id):
            return jsonify({"error": "Unauthorized"}), 403

        delete_cursor = connection.cursor()
        delete_cursor.execute(
            "DELETE FROM dishes WHERE id = %s AND restaurant_id = %s",
            (dish_id, current_restaurant_id),
        )
        connection.commit()

        if delete_cursor.rowcount == 0:
            return jsonify({"error": "Unauthorized"}), 403

        return jsonify({"message": "Dish deleted successfully"}), 200
    except Error as error:
        return jsonify({"error": f"Failed to delete dish: {error}"}), 500
    finally:
        if owner_cursor:
            owner_cursor.close()
        if delete_cursor:
            delete_cursor.close()
        if connection and connection.is_connected():
            connection.close()


@app.route("/api/price-history", methods=["GET"])
@jwt_required()
def get_price_history():
    current_user_id = get_jwt_identity()
    current_user = get_user_by_id(current_user_id)

    if not current_user:
        return jsonify({"error": "User not found"}), 404

    restaurant_id = current_user.get("restaurant_id") or current_user.get("id")

    raw_metric = (request.args.get("metric") or "our_price").strip().lower()
    metric = raw_metric if raw_metric in {"our_price", "competitor_avg"} else "our_price"

    try:
        requested_days = int(request.args.get("days", 7))
    except (TypeError, ValueError):
        requested_days = 7

    days = max(1, min(requested_days, 30))

    dish_id = request.args.get("dish_id", type=int)
    end_date = datetime.utcnow().date()
    start_date = end_date - timedelta(days=days - 1)

    connection = None
    history_cursor = None
    baseline_cursor = None
    try:
        connection = get_db_connection()
        history_cursor = connection.cursor(dictionary=True)

        history_query = """
            SELECT DATE(recorded_at) AS history_day, AVG(price_value) AS avg_price
            FROM dish_price_history
            WHERE restaurant_id = %s
              AND metric = %s
              AND recorded_at >= %s
        """
        history_params = [restaurant_id, metric, datetime.combine(start_date, datetime.min.time())]

        if dish_id is not None:
            history_query += " AND dish_id = %s"
            history_params.append(dish_id)

        history_query += " GROUP BY DATE(recorded_at) ORDER BY history_day ASC"

        history_cursor.execute(history_query, tuple(history_params))
        history_rows = history_cursor.fetchall()

        day_to_price = {}
        for row in history_rows:
            history_day = row.get("history_day")
            avg_price = row.get("avg_price")
            if history_day is None or avg_price is None:
                continue
            day_to_price[history_day] = float(avg_price)

        baseline_cursor = connection.cursor(dictionary=True)
        baseline_query = f"SELECT AVG({metric}) AS baseline_price FROM dishes WHERE restaurant_id = %s"
        baseline_params = [restaurant_id]
        if dish_id is not None:
            baseline_query += " AND id = %s"
            baseline_params.append(dish_id)

        baseline_cursor.execute(baseline_query, tuple(baseline_params))
        baseline_row = baseline_cursor.fetchone() or {}
        baseline_price = baseline_row.get("baseline_price")
        baseline_value = float(baseline_price) if baseline_price is not None else None

        points = []
        last_known_value = None
        for offset in range(days):
            current_day = start_date + timedelta(days=offset)
            value = day_to_price.get(current_day)

            if value is None:
                value = last_known_value
            if value is None:
                value = baseline_value

            if value is not None:
                last_known_value = value

            points.append(
                {
                    "day": current_day.strftime("%a"),
                    "date": current_day.isoformat(),
                    "price": round(value, 2) if value is not None else None,
                }
            )

        return jsonify({"metric": metric, "dish_id": dish_id, "days": days, "points": points}), 200
    except Error as error:
        return jsonify({"error": f"Failed to fetch price history: {error}"}), 500
    finally:
        if history_cursor:
            history_cursor.close()
        if baseline_cursor:
            baseline_cursor.close()
        if connection and connection.is_connected():
            connection.close()


@app.route("/api/analysis/summary", methods=["GET"])
@jwt_required()
def get_analysis_summary():
    current_user_id = get_jwt_identity()
    current_user = get_user_by_id(current_user_id)

    if not current_user:
        return jsonify({"error": "User not found"}), 404

    restaurant_id = current_user.get("restaurant_id") or current_user.get("id")

    connection = None
    competitor_cursor = None
    status_cursor = None
    try:
        connection = get_db_connection()

        competitor_cursor = connection.cursor(dictionary=True)
        competitor_cursor.execute(
            """
            SELECT id, restaurant_name, platform, website_url, status, mock_file,
                   dishes_tracked, scraped_title, last_updated, created_at
            FROM competitors
            WHERE restaurant_id = %s
            ORDER BY id ASC
            """,
            (restaurant_id,),
        )
        competitors = competitor_cursor.fetchall()

        status_cursor = connection.cursor(dictionary=True)
        status_cursor.execute(
            """
            SELECT LOWER(status) AS status, COUNT(*) AS competitor_count,
                   COALESCE(SUM(dishes_tracked), 0) AS dishes_tracked_total
            FROM competitors
            WHERE restaurant_id = %s
            GROUP BY LOWER(status)
            """,
            (restaurant_id,),
        )
        rows = status_cursor.fetchall()

        status_bands = {
            "low": {"competitor_count": 0, "dishes_tracked_total": 0},
            "medium": {"competitor_count": 0, "dishes_tracked_total": 0},
            "premium": {"competitor_count": 0, "dishes_tracked_total": 0},
        }

        for row in rows:
            status_key = row.get("status")
            if status_key in status_bands:
                status_bands[status_key] = {
                    "competitor_count": int(row.get("competitor_count") or 0),
                    "dishes_tracked_total": int(row.get("dishes_tracked_total") or 0),
                }

        return (
            jsonify(
                {
                    "restaurant_id": restaurant_id,
                    "total_competitors": len(competitors),
                    "status_bands": status_bands,
                    "competitors": competitors,
                }
            ),
            200,
        )
    except Error as error:
        return jsonify({"error": f"Failed to fetch analysis summary: {error}"}), 500
    finally:
        if competitor_cursor:
            competitor_cursor.close()
        if status_cursor:
            status_cursor.close()
        if connection and connection.is_connected():
            connection.close()


if __name__ == "__main__":
    ensure_database()
    if check_mysql_connection():
        ensure_users_table()
        ensure_dishes_table()
        ensure_competitors_table()
        ensure_alerts_table()
        ensure_price_history_table()
    if not app.debug or os.environ.get("WERKZEUG_RUN_MAIN") == "true":
        scheduler.start()
    app.run()
