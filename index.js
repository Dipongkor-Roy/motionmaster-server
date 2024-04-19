
// Import necessary modules
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();

// Initialize Express app
const app = express();

app.use(cors());
const port = process.env.PORT || 2000;

// MongoDB connection URI
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
const uri = `mongodb+srv://${DB_USER}:${DB_PASSWORD}@cluster0.8zviwwt.mongodb.net`;

// Middleware setup
app.use(cors());
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Function to run the server
async function run() {
  // Create a MongoClient instance
  const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });

  try {
    // Connect to MongoDB
    await client.connect();

    // Define MongoDB collections
    const allServices = client.db("MotionMasterDB").collection("AllServices");
    const userCollection = client.db("MotionMasterDB").collection("Users");
    const cartsCollection = client.db("MotionMasterDB").collection("carts");

    // JWT token generation endpoint
    app.post("/jwt", async (req, res) => {
      // Generate JWT token based on user credentials
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token }); // Send token as an object
    });

    // Middleware to verify JWT token
    const verifyToken = (req, res, next) => {
      // Verify JWT token sent in the Authorization header
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "forbidden Access" });
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "forbidden Access" });
        }
        req.decoded = decoded;
        next(); // Continue to next middleware
      });
    };

    // Middleware to verify admin role
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === 'admin';
      if (!isAdmin) {
        return res.status(403).send({ message: 'forbidden access' });
      }
      next();
    }

    // Routes
    // Root route
    app.get("/", (req, res) => {
      res.send("Welcome To Motion-Master Server");
    });

    // Get all services
    app.get("/services", async (req, res) => {
      const services = await allServices.find({}).toArray();
      res.send(services);
    });

    // Create a new service
    app.post("/services", verifyToken, verifyAdmin,async (req, res) => {
      const item = req.body;
      const result = await allServices.insertOne(item);
      res.send(result);
    });

    // Get a service by its ID
    app.get("/services/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const services = await allServices.find(filter).toArray();
      res.send(services);
    });

    // Update a service item
    app.patch("/services/:id", async (req, res) => {
      const item = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          name: item.name,
          price: item.price,
          description: item.description,
          image: item.image,
        },
      };
      const result = await allServices.updateOne(filter, updateDoc);
      res.send(result);
    });
    app.delete('/services/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await allServices.deleteOne(query);
      res.send(result);
    })
    app.patch('/services/:id', async (req, res) => {
      const item = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updatedDoc = {
        $set: {
          name: item.name,
          price: item.price,
          description: item.description,
          image: item.image
        }
      }
      const result = await allServices.updateOne(filter, updatedDoc)
      res.send(result)
    })
    // Get all users
    app.get("/users", async (req, res) => {
      const query = {};
      const result = await userCollection.find(query).toArray();
      res.send(result);
    });

    // Create a new user
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "User Already Exist", insertedId: null });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    // Delete a user by ID
    app.delete("/users/:id",verifyToken, verifyAdmin,async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });

    // Get admin status for a user by email
    app.get("/users/admin/:email",verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded?.email) {
        return res.status(403).send({ message: "unauthorized access" });
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === "admin";
      }
      res.send({ admin });
    });

    // Promote a user to admin
    app.patch("/users/admin/:id",verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // Get carts for a specific user by email
    app.get("/carts", async (req, res) => {
      const email = req.query.email;
      if (!email) {
        return res.send([]);
      }
      const query = { email: email };
      const result = await cartsCollection.find(query).toArray();
      res.send(result);
    });

    // Add an item to the cart
    app.post("/carts", async (req, res) => {
      const item = req.body;
      const result = await cartsCollection.insertOne(item);
      res.send(result);
    });

    // Remove an item from the cart by ID
    app.delete("/carts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartsCollection.deleteOne(query);
      res.send(result);
    });

    // Ping MongoDB deployment
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");

    // Start server
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  } catch (error) {
    console.error("Error:", error);
    process.exit(1); // Exit with error
  }
}

// Call the run function to start the server
run();

