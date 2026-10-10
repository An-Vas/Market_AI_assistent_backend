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

Для ответов AI также запустите локальный FastAPI ML-сервис и Ollama. (Подробности в репозитории [ai-assistant](https://gitlab.com/Elitra/ai-assistant))

Для запросов о заказах backend попросит `orderId`; прочие ответы генерирует Ollama из подходящей статьи базы знаний. `sessionId` — внешний ID сессии. Для доступа к заказу `userId` должен совпадать с его владельцем.

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
