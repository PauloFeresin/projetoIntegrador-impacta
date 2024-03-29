const express = require("express");
const { MongoClient } = require("mongodb");
const bodyParser = require("body-parser");
const path = require("path");

const app = express();
const port = 3000;

const uri =
  "mongodb+srv://pauloferesin:Smarters%402023@meucluster.mfvzhcx.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

async function connectToMongoDB() {
  await client.connect();
  return client.db("projetoIntegrador");
}

app.get("/register", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "register.html"));
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.post("/register", async (req, res) => {
  try {
    const db = await connectToMongoDB();
    const collection = db.collection("users");

    const { username, email, password } = req.body;

    const existingUser = await collection.findOne({
      $or: [{ username }, { email }],
    });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "Nome de usuário ou e-mail já existem" });
    }

    const newUser = { username, email, password };
    const result = await collection.insertOne(newUser);

    res.status(201).json({
      message: "Usuário registrado com sucesso",
      userId: result.insertedId,
    });
  } catch (error) {
    console.error("Erro ao registrar usuário:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  } finally {
    await client.close();
  }
});

app.post("/login", async (req, res) => {
  try {
    const db = await connectToMongoDB();
    const collection = db.collection("users");

    const { email, password } = req.body;

    const user = await collection.findOne({ email, password });
    if (user) {
      res.status(200).json({ message: "Login bem-sucedido", userId: user._id });
    } else {
      res.status(401).json({ message: "E-mail ou senha inválidos" });
    }
  } catch (error) {
    console.error("Erro ao fazer login:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  } finally {
    await client.close();
  }
});

async function handleComments(req, res) {
  try {
    const db = await connectToMongoDB();
    const collection = db.collection("comments");

    if (req.method === "POST") {
      const { comment } = req.body;
      const result = await collection.insertOne({ comment });

      if (result.acknowledged) {
        res.status(201).json({
          message: "Comentário publicado com sucesso",
          commentId: result.insertedId.toHexString(),
        });
      } else {
        console.error("Erro ao publicar comentário: Inserção não reconhecida");
        res.status(500).json({ message: "Erro interno do servidor" });
      }
    } else if (req.method === "GET") {
      const comments = await collection.find().toArray();
      res.status(200).json(comments);
    }
  } catch (error) {
    console.error("Erro ao manipular comentários:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  } finally {
    await client.close();
  }
}

app.route("/comments").post(handleComments).get(handleComments);

app.listen(port, () => {
  console.log(`Servidor está rodando em http://localhost:${port}`);
});
