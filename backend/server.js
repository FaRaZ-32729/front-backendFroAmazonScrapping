const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();
const scrapeRoute = require("./src/routes/scrapeRoute");
const verifyRoute = require("./src/routes/verifyRoute");
const dbConnection = require("./src/config/DB_Connection");


dbConnection();
const app = express();

app.use(express.json());
app.use(cors({
    origin: "http://localhost:5173",
    credentials: true
}));

app.use(express.static(path.join(__dirname, "public")));

app.use("/api", scrapeRoute);
app.use("/api", verifyRoute);

app.listen(5000, () => {
    console.log("Server running on http://localhost:5000");
});