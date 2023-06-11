const express = require('express');
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
require('dotenv').config()
const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY);
const port = process.env.PORT || 5000;

// middlewares
app.use(cors());
app.use(express.json());

// lodgeUser
// kaqkMyl6LX8Lrsc2



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.phgiqsm.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    // collections
    const usersCollection = client.db('lodgeDb').collection('users');
    const classesCollection = client.db('lodgeDb').collection('classes');
    const selectedClass = client.db('lodgeDb').collection('selectedClass');
    const instructorCollection = client.db('lodgeDb').collection('instructor');
    const paymentCollection = client.db('lodgeDb').collection('payments');

    // users ---------

    app.post('/users', async (req, res) => {
      const user = req.body;
      // console.log(user);
      const query = { email: user.email }
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        // console.log(existingUser);
        return res.send({ message: 'user already exists' })
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    app.get('/users/role/:email', async (req, res) => {
      const email = req.params.email;
      // console.log(email);
      const query = { email: email };
      const result = await usersCollection.findOne(query);

      res.send(result);
    });

    app.get('/users', async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    // addmin works
    app.patch('/users/role/:id', async (req, res) => {
      const id = req.params.id;
      let roleToUpdate = req.body.role;
      // console.log(roleToUpdate);

      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: roleToUpdate
        },
      };

      const result = await usersCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    app.patch('/classes/status/:id', async (req, res) => {
      const id = req.params.id;
      let roleToUpdate = req.body.status;
      console.log(roleToUpdate);

      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          status: roleToUpdate
        },
      };

      const result = await classesCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });





    // clasees ---------

    app.get('/classes', async (req, res) => {
      const result = await classesCollection.find({ status: 'Approved' }).toArray();
      res.send(result);
    });

    app.post('/classes', async (req, res) => {
      const newClass = req.body;
      const result = await classesCollection.insertOne(newClass);
      res.send(result);
    });

    app.post('/selected', async (req, res) => {
      const item = req.body;
      // console.log(item);
      const result = await selectedClass.insertOne(item);
      res.send(result);
    });

    app.get('/selected/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email, payment_status: { $exists: false } };
      const result = await selectedClass.find(query).toArray();
      res.send(result);
    });



    app.get('/allclasses', async (req, res) => {
      const result = await classesCollection.find().toArray();
      res.send(result);
    });


    // instructor
    app.get('/classes/:email', async (req, res) => {
      const email = req.params.email;
      // console.log(email);

      const query = { instructor_email: email };
      const cursor = await classesCollection.find(query).toArray();
      res.send(cursor);
    });

    app.post('/instructors', async (req, res) => {
      const newInstructor = req.body;
      const query = { email: newInstructor.email }
      const existingUser = await instructorCollection.findOne(query);
      if (existingUser) {
        // console.log(existingUser);
        return res.send({ message: 'instructor already exists' })
      }
      const result = await instructorCollection.insertOne(newInstructor);
      res.send(result);
    });


    app.delete('/selected/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };

      const result = await selectedClass.deleteOne(query);
      res.send(result);
    });

    // payments -----------

    app.post('/create-payment-intent', async (req, res) => {
      const { price } = req.body;
      const amount = parseFloat(price * 100);

      // console.log(price, amount);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      },
        // {
        //   apiKey: process.env.PAYMENT_SECRET_KEY
        // }
      );

      res.send({
        clientSecret: paymentIntent.client_secret
      })
    });


    app.post('/payments', async (req, res) => {
      const payment = req.body;
      // console.log(payment);
      const id = payment.id;
      const classId = payment.classId;
      // console.log(payment.id);
      // console.log(classId);


      // classes -----------
      const classQuery = { _id: new ObjectId(classId) };
      const classUpdate = { $inc: { enrolled_student: 1 } };
      const classesUpdateResult = await classesCollection.updateOne(classQuery, classUpdate);


      // selected classes -----
      const selectedClassQuery = { _id: new ObjectId(id) };
      const selectedClassUpdate = { $set: { payment_status: 'paid' } };
      const selectedClassUpdateResult = await selectedClass.updateOne(selectedClassQuery, selectedClassUpdate);


      // payments -----------
      const insertResult = await paymentCollection.insertOne(payment);

      // const query = { _id: new ObjectId(id) }
      // const deleteResult = await selectedClass.deleteOne(query)

      res.send({ insertResult, classesUpdateResult, selectedClassUpdateResult });
    });





    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('LinguaLodge');
})

app.listen(port, () => {
  console.log(`lodge is running on port ${port}`);
})