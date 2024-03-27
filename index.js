
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');

const app = express();
const port = process.env.PORT || 2000; // Use port from environment variable or default to 6000
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
// Use CORS middleware
app.use(cors());

const uri = `mongodb+srv://${DB_USER}:${DB_PASSWORD}@cluster0.8zviwwt.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
//All Collections

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});
async function run() {
  try {
    const allServices= client.db("MotionMasterDB").collection("AllServices");
    app.get("/allservices",async(req,res)=>{
        const query={};
        const services=await allServices.find(query).toArray();
        res.send(services);
    })
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Welcome To Motion-Master Server');
});


app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
