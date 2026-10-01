export enum RequestCategory {
    // CONTACT
    customer_service = 10,
    human_agent = 11,
    // ACCOUNT
    change_account = 20,
    close_account = 21,
    open_account = 22,
    order_history = 23,
    recover_password = 24,
    // APP_WEBSITE
    technical_issue = 30,
    use_app = 31,
    // CART
    add_product = 40,
    remove_product = 41,
    // DELIVERY
    damaged_delivery = 50,
    delivery_issue = 51,
    delivery_time = 52,
    missing_item = 53,
    shipping_costs = 54,
    track_delivery = 55,
    wrong_item = 56,
    // FEEDBACK
    submit_feedback = 60,
    submit_product_feedback = 61,
    submit_product_idea = 62,
    // ORDER
    cancel_order = 70,
    change_order = 71,
    request_invoice = 72,
    track_order = 73,
    // PAYMENT
    pay = 80,
    payment_issue = 81,
    payment_methods = 82,
    // PRODUCT
    availability = 90,
    availability_in_store = 91,
    availability_online = 92,
    exchange_product = 93,
    exchange_product_in_store = 94,
    product_information = 95,
    product_issue = 96,
    // RETURNS
    refund_policy = 100,
    refund_status = 101,
    request_refund = 102,
    return_policy = 103,
    return_product = 104,
    return_product_in_store = 105,
    return_product_online = 106,
    // SALES
    sales_period = 110,
    // STORE
    store_location = 120,
    store_opening_hours = 121,
    // USER
    request_right_to_rectification = 130,

}


export const NeedOrderDetailsCategories = [
  // DELIVERY
  RequestCategory.damaged_delivery,
  RequestCategory.delivery_issue,
  RequestCategory.delivery_time,
  RequestCategory.missing_item,
  RequestCategory.shipping_costs,
  RequestCategory.track_delivery,
  RequestCategory.wrong_item,
  // ORDER
  RequestCategory.cancel_order,
  RequestCategory.change_order,
  RequestCategory.request_invoice,
  RequestCategory.track_order,
  // RETURNS
  RequestCategory.refund_policy,
  RequestCategory.refund_status,
  RequestCategory.request_refund,
  RequestCategory.return_policy,
  RequestCategory.return_product,
  RequestCategory.return_product_in_store,
  RequestCategory.return_product_online,
];