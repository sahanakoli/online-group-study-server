const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors({
  origin: ['http://localhost:5173', 'https://zingy-stroopwafel-76030e.netlify.app'],
  credentials: true
}));
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.6oh3q2n.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// middleware
const verifyToken = async(req, res, next) => {
  const token = req.cookies?.token;
  if(!token){
    return res.status(401).send({message: 'unauthorized access'})
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) =>{
    if(err){
      return res.status(401).send({message: 'unauthorized access'})
    }
    req.user = decoded;
    next();
  })
}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

     const assignmentCollection = client.db('onlineStudy').collection('assignments');
     
    // auth related api
    app.post('/jwt', async(req, res) =>{
      const user = req.body;
      console.log(user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '1h'})
      
      res
      .cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production'? 'none' : 'strict'
      })
      .send({success: true});
    })
    
    app.post('/logout', async(req, res) => {
      const user = req.body;
      console.log('logging out', user);
      res.clearCookie('token', {maxAge: 0}).send({success: true}) 
    })
    

    // assignment related api
    app.post('/assignments',  async(req, res) =>{
      const newAssignment = req.body;
      console.log(newAssignment);
      const result = await assignmentCollection.insertOne(newAssignment);
      res.send(result);
    })

    
    app.get('/assignments', async(req, res) => {
      const page = parseInt(req.query.page);
      console.log('pagination', page);
      const cursor = assignmentCollection.find();
      const result = await cursor
      .skip(page)
      .toArray();
      res.send(result);
    })

    app.get("/assignments/:id", async (req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id),};
      const result = await assignmentCollection.findOne(query);
      console.log(result);
      res.send(result);
    });

    app.put('/assignments/:id',  async(req, res) => {
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)}
      const options = {upsert: true};
      const updatedAssignment = req.body;

      const assignment = {
        $set: {
          title: updatedAssignment.title,
          description: updatedAssignment.description,
          photo: updatedAssignment.photo,
          date: updatedAssignment.date,
          marks: updatedAssignment.marks,
          level: updatedAssignment.level
        }
      }

      const result = await assignmentCollection.updateOne(filter, assignment, options)
      res.send(result);
    })

    app.delete('/assignments/:id', async(req, res) =>{
      const id = req.params.id;
      const query = { _id: new ObjectId(id)}
      const result = await assignmentCollection.deleteOne(query);
      res.send(result);
    })

     // Send a ping to confirm a successful connection
    
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req,res) => {
    res.send('server is running')
})

app.listen(port, () => {
    console.log(`online group study is running on port ${port}`)
})