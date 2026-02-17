/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
    // @TODO: Расчет выручки от операции

    // purchase - это объект товара из чека (item)
    // _product - карточка товара (не используется в расчете)

    // 1. Коэффициент скидки: 1 - (скидка в процентах / 100)
    const discount = 1 - (purchase.discount / 100);

    // 2. Выручка = цена продажи × количество × коэффициент скидки
    return purchase.sale_price * purchase.quantity * discount;
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
    // @TODO: Расчет бонуса от позиции в рейтинге
    // Первое место (index = 0) - 15% от прибыли
    if (index === 0) {
        return seller.profit * 0.15;
    }

    // Второе и третье место (index = 1 или 2) - 10% от прибыли
    else if (index === 1 || index === 2) {
        return seller.profit * 0.10;
    }

    // Последнее место (index = total - 1) - 0%
    else if (index === total - 1) {
        return 0;
    }

    // Все остальные продавцы - 5% от прибыли
    else {
        return seller.profit * 0.05;
    }
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {

    // @TODO: Проверка входных данных
    if (!data ||
        !Array.isArray(data.sellers) ||
        !Array.isArray(data.products) ||
        !Array.isArray(data.purchase_records) ||
        data.sellers.length === 0 ||
        data.products.length === 0 ||
        data.purchase_records.length === 0
    ) {
        throw new Error('Некорректные входные данные');
    }

    // @TODO: Проверка наличия опций
    const {
        calculateRevenue,
        calculateBonus
    } = options;

    if (typeof calculateRevenue !== 'function' || typeof calculateBonus !== 'function') {
        throw new Error('Чего-то не хватает');
    }

    // @TODO: Подготовка промежуточных данных для сбора статистики
    const sellerStats = data.sellers.map(seller => ({
        // Заполним начальными данными
        id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,
        revenue: 0,
        profit: 0,
        sales_count: 0,
        products_sold: {}
    }));

    // @TODO: Индексация продавцов и товаров для быстрого доступа
    // Индекс товаров (по sku)
    const productIndex = Object.fromEntries(
        data.products.map(product => [product.sku, product])
    );

    // Индекс продавцов (по id из sellerStats)
    const sellerIndex = Object.fromEntries(
        sellerStats.map(stat => [stat.id, stat])
    );

    // @TODO: Расчет выручки и прибыли для каждого продавца
    data.purchase_records.forEach(record => {
        // Получаем продавца по индексу
        const seller = sellerIndex[record.seller_id];

        // 1. Увеличиваем количество продаж (чеков)
        seller.sales_count += 1;

        // 2. Увеличиваем общую выручку на сумму чека (total_amount)
        seller.revenue += record.total_amount;

        // 3. Перебираем товары для расчета прибыли
        record.items.forEach(item => {
            // Получаем товар по индексу
            const product = productIndex[item.sku];

            // Считаем выручку по товару (для расчета прибыли)
            const itemRevenue = calculateRevenue(item, product);

            // Считаем себестоимость
            const cost = product.purchase_price * item.quantity;

            // Считаем прибыль по товару
            const profit = itemRevenue - cost;

            // Добавляем прибыль к общей прибыли продавца
            seller.profit += profit;

            // Обновляем статистику по товарам
            if (!seller.products_sold[item.sku]) {
                seller.products_sold[item.sku] = 0;
            }
            seller.products_sold[item.sku] += item.quantity;
        });
    });

    // @TODO: Сортировка продавцов по прибыли
    sellerStats.sort((a, b) => b.profit - a.profit);

    // @TODO: Назначение премий на основе ранжирования
    sellerStats.forEach((seller, index) => {
        // 1. Рассчитываем бонус на основе позиции в рейтинге
        seller.bonus = calculateBonus(index, sellerStats.length, seller);

        // 2. Формируем топ-10 товаров
        seller.top_products = Object.entries(seller.products_sold)
            .map(([sku, quantity]) => ({
                sku,
                quantity
            }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);
    });

    // @TODO: Подготовка итоговой коллекции с нужными полями
    return sellerStats.map(seller => ({
        seller_id: seller.id,
        name: seller.name,
        revenue: +seller.revenue.toFixed(2),
        profit: +seller.profit.toFixed(2),
        sales_count: seller.sales_count,
        top_products: seller.top_products,
        bonus: +seller.bonus.toFixed(2)
    }));
}