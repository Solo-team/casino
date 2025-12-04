import json
import os
from bs4 import BeautifulSoup

def get_unique_filename(base_name="nft_data", extension=".json"):
    """
    Проверяет существование файла.
    Если nft_data.json занят, выдает nft_data_1.json, nft_data_2.json и т.д.
    """
    if not os.path.exists(f"{base_name}{extension}"):
        return f"{base_name}{extension}"
    
    counter = 1
    while True:
        new_filename = f"{base_name}_{counter}{extension}"
        if not os.path.exists(new_filename):
            return new_filename
        counter += 1

def parse_html_to_json():
    html_file = 'index.html'
    
    # Генерируем имя файла для сохранения
    json_output_file = get_unique_filename("nft_collection")

    try:
        with open(html_file, 'r', encoding='utf-8') as f:
            content = f.read()
    except FileNotFoundError:
        print(f"❌ Ошибка: Файл '{html_file}' не найден. Сохраните HTML страницы в этот файл.")
        return

    soup = BeautifulSoup(content, 'html.parser')
    nft_data = []

    # Находим все карточки NFT
    items = soup.find_all('div', class_='NftItemContainer')

    for item in items:
        # 1. Ссылка на изображение
        img_tag = item.find('img', class_='LibraryMedia')
        image_url = img_tag.get('src') if img_tag else None

        # 2. Название NFT
        name_tag = item.find('span', class_='NftItemNameContent__name')
        name = name_tag.get_text(strip=True) if name_tag else "Unknown Name"

        # 3. Цена (LibraryCryptoPrice__amount)
        price_tag = item.find('div', class_='LibraryCryptoPrice__amount')
        price = price_tag.get_text(strip=True) if price_tag else "Not Listed"

        # Собираем только если есть картинка (чтобы исключить пустые блоки)
        if image_url:
            nft_data.append({
                "name": name,
                "price": price,
                "image_url": image_url
            })

    # Если список не пуст, сохраняем
    if nft_data:
        with open(json_output_file, 'w', encoding='utf-8') as f:
            json.dump(nft_data, f, indent=4, ensure_ascii=False)
        
        print(f"✅ Успешно обработано! Найдено элементов: {len(nft_data)}")
        print(f"📁 Результат сохранен в файл: {json_output_file}")
    else:
        print("⚠️ NFT не найдены. Проверьте содержимое файла index.html")

if __name__ == '__main__':
    parse_html_to_json()