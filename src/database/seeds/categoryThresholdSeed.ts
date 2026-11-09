// Стартовые значения таблицы category_confidence_thresholds — применяются только
// при первом запуске (если таблица пуста). Дальше порог живёт в БД и правится
// там, без изменения кода.

interface CategorySeed {
  category: string;
  intents: string[];
  confidenceThreshold: number;
}

const SEED_BY_CATEGORY: CategorySeed[] = [
  { category: 'CONTACT', intents: ['customer_service', 'human_agent'], confidenceThreshold: 0.4 },
  {
    category: 'ACCOUNT',
    intents: ['change_account', 'close_account', 'open_account', 'order_history', 'recover_password'],
    confidenceThreshold: 0.85,
  },
  { category: 'APP_WEBSITE', intents: ['technical_issue', 'use_app'], confidenceThreshold: 0.4 },
  { category: 'CART', intents: ['add_product', 'remove_product'], confidenceThreshold: 0.4 },
  {
    category: 'DELIVERY',
    intents: [
      'damaged_delivery',
      'delivery_issue',
      'delivery_time',
      'missing_item',
      'shipping_costs',
      'track_delivery',
      'wrong_item',
    ],
    confidenceThreshold: 0.85,
  },
  {
    category: 'FEEDBACK',
    intents: ['submit_feedback', 'submit_product_feedback', 'submit_product_idea'],
    confidenceThreshold: 0.4,
  },
  {
    category: 'ORDER',
    intents: ['cancel_order', 'change_order', 'request_invoice', 'track_order'],
    confidenceThreshold: 0.85,
  },
  { category: 'PAYMENT', intents: ['pay', 'payment_issue', 'payment_methods'], confidenceThreshold: 0.85 },
  {
    category: 'PRODUCT',
    intents: [
      'availability',
      'availability_in_store',
      'availability_online',
      'exchange_product',
      'exchange_product_in_store',
      'product_information',
      'product_issue',
    ],
    confidenceThreshold: 0.65,
  },
  {
    category: 'RETURNS',
    intents: [
      'refund_policy',
      'refund_status',
      'request_refund',
      'return_policy',
      'return_product',
      'return_product_in_store',
      'return_product_online',
    ],
    confidenceThreshold: 0.85,
  },
  { category: 'SALES', intents: ['sales_period'], confidenceThreshold: 0.4 },
  { category: 'STORE', intents: ['store_location', 'store_opening_hours'], confidenceThreshold: 0.65 },
  { category: 'USER', intents: ['request_right_to_rectification'], confidenceThreshold: 0.4 },
];

export const CATEGORY_THRESHOLD_SEED = SEED_BY_CATEGORY.flatMap(({ category, intents, confidenceThreshold }) =>
  intents.map((intent) => ({ category, intent, confidenceThreshold })),
);
