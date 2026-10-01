## Бекенд-часть приложения AI ассистента для интернет-магазина
### Развертывание

Условия: должны быть установлены node, typescript, npm
```
git clone https://github.com/An-Vas/Market_AI_assistent_backend.git
cd Market_AI_assistent_backend
npm i 
cp .env.example .env
npm run dev
```

Для проверки, что сервис запустился, можно открыть в браузере http://localhost:5005/hello, должен возвратиться ответ hello.
При необходимости изменить порт, на котором развернут сервер или изменить адрес МЛ-апи - изменить соответствующие параметры в сгенерированном .env файле.

При необходимости сбросить все внесенные в базу данных изменения можно удалить файл database.sqlite в корне репозитория и перезапустить сервер. Стартовые данные в базе данных включают в себя 4 заказа на идентификаторы пользователей 5, 6, 7. 


```
{ orderComposition: '1 red book', status: 'created', deliveryDate: new Date(), userId: '5' },
{ orderComposition: 'white table lamp', status: 'created', deliveryDate: new Date(), userId: '6' },
{ orderComposition: 'plates with cat pictures', status: 'delivered', deliveryDate: new Date(), userId: '7' },
{ orderComposition: 'pillow', status: 'created', deliveryDate: new Date(), userId: '7' }
```

Чтобы запросы к AI успешно обрабатывались, необходимо также развернуть ml сервис из репозитория https://gitlab.com/Elitra/ai-assistant
Краткий гайд на его развертывание: 
Условия: изначально должен быть установлен питон pip

```
git clone https://gitlab.com/Elitra/ai-assistant.git
cd ai-assistant
python --version
python -m venv .venv
.venv\Scripts\activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
uvicorn main:app --reload
```
Проверка что запустилось: `http://127.0.0.1:8000/health`

### Использование бека: 
Бек поддерживает два запроса.
Первый запрос (для теста успешного развертывания):

`GET http://localhost:5005/hello ` 

Ответ: hello

Второй запрос (для использования пользователем): 

`POST http://localhost:5005/support`

Тело запроса: 
```
{
    "message" : "some usual tet wtith same mistaks",
    "sessionId": 8,
    "userId": 1,
    "orderId": 1
}
```
Параметр orderId необязательный. Указывать его можно, но учитываться он будет только в категориях где эта информация нужна. Если заказ принадлежит другому пользователю придет снова сообщение "укажите или перепроверьте номер заказа" (на английском).
