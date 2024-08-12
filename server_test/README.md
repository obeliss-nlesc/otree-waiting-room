## Load test server

Run the server

```bash
npm run dev-newDb
```

Run testing script with 99 users

```bash
node test_user_flow.js -hn localhost -p 8060 -e DropOutTest -n 99
```

Run parallel tests using all cores available

```bash
bash start.sh 99 localhost 8060 DropOutTest
```
