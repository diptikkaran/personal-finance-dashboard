Personal Finance Dashboard - Fullstack (React + Spring Boot)

Backend:
- Java 17+, Spring Boot
- Run: mvn spring-boot:run (from backend folder)
- H2 console: http://localhost:8080/h2-console (JDBC URL: jdbc:h2:mem:finance)

Frontend:
- Create React app scaffold or use included files
- From frontend folder: npm install && npm start
- React will run on http://localhost:3000

API Endpoints:
- POST /api/auth/register  { username, password }
- POST /api/auth/login     { username, password } -> returns { token }
- GET /api/transactions    (Authorization: Bearer <token>)
- POST /api/transactions   { description, amount, transactionType }
- DELETE /api/transactions/{id}
