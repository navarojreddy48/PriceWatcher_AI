import os
import re

from bs4 import BeautifulSoup


def _extract_from_menu_dom(soup: BeautifulSoup):
    restaurants = soup.find_all("div", class_="restaurant-card")
    containers = restaurants if restaurants else [soup]

    dishes_list = []
    for restaurant in containers:
        menu_items = restaurant.find_all("div", class_="menu-item")

        for item in menu_items:
            name_node = item.find("span", class_="dish-name")
            price_node = item.find("span", class_="dish-price") or item.find("span", class_="price")

            if not name_node or not price_node:
                continue

            try:
                dish_name = name_node.text.strip()
                dish_price = float(price_node.text.strip())
            except (AttributeError, TypeError, ValueError):
                continue

            dishes_list.append({"dish_name": dish_name, "price": dish_price})

    return dishes_list


def _extract_from_embedded_script(html_content: str):
    pattern = re.compile(
        r"name\s*:\s*'(?P<name>[^']+)'\s*,\s*category\s*:\s*'[^']+'\s*,\s*basePrice\s*:\s*(?P<price>\d+(?:\.\d+)?)",
        re.IGNORECASE,
    )
    matches = pattern.findall(html_content)

    dishes_list = []
    seen_names = set()
    for name, price_text in matches:
        dish_name = (name or "").strip()
        if not dish_name:
            continue

        normalized = dish_name.lower()
        if normalized in seen_names:
            continue

        try:
            dish_price = float(price_text)
        except (TypeError, ValueError):
            continue

        seen_names.add(normalized)
        dishes_list.append({"dish_name": dish_name, "price": dish_price})

    return dishes_list


def scrape_competitor_file(file_name):
    try:
        normalized_name = os.path.basename((file_name or "").strip())
        if not normalized_name:
            return []

        file_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "mock_sites", normalized_name)

        with open(file_path, "r", encoding="utf-8") as html_file:
            html_content = html_file.read()
    except FileNotFoundError:
        return []
    except OSError:
        return []

    try:
        soup = BeautifulSoup(html_content, "html.parser")
        dishes_list = _extract_from_menu_dom(soup)
        if not dishes_list:
            dishes_list = _extract_from_embedded_script(html_content)

        return {
            "competitor": normalized_name,
            "total_dishes": len(dishes_list),
            "data": dishes_list,
        }
    except Exception:
        return []
