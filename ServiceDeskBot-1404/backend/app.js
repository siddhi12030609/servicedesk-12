let currentPage = 1;
const rowsPerPage = 5;
let allUsers = [];
const express = require("express")
const cors = require("cors")
const bodyParser = require("body-parser")

const app = express()

app.use(cors())
app.use(bodyParser.json())

// In-memory database (temporary storage)
let requests = []
let notifications = []

// ============================
// CREATE REQUEST
// ============================

app.post("/create-request", (req, res) => {

    const { title, description } = req.body

    if (!title || !description) {
        return res.status(400).json({
            message: "Title and Description required"
        })
    }

    const newRequest = {

        id: requests.length + 1,
        title: title,
        description: description,
        status: "Pending",
        createdAt: new Date()

    }

    requests.push(newRequest)

    notifications.push({
        message: "New request created: " + title
    })

    res.json({
        message: "Request created successfully",
        request: newRequest
    })

})


// ============================
// GET MY REQUESTS
// ============================

app.get("/my-requests", (req, res) => {

    res.json(requests)

})


// ============================
// STATUS TRACKING
// ============================

app.get("/request-status/:id", (req, res) => {

    const id = parseInt(req.params.id)

    const request = requests.find(r => r.id === id)

    if (!request) {
        return res.status(404).json({
            message: "Request not found"
        })
    }

    res.json({
        id: request.id,
        status: request.status
    })

})


// ============================
// CANCEL REQUEST
// ============================

app.delete("/cancel-request/:id", (req, res) => {

    const id = parseInt(req.params.id)

    const index = requests.findIndex(r => r.id === id)

    if (index === -1) {
        return res.status(404).json({
            message: "Request not found"
        })
    }

    const removed = requests.splice(index, 1)

    notifications.push({
        message: "Request cancelled: " + removed[0].title
    })

    res.json({
        message: "Request cancelled successfully"
    })

})


// ============================
// NOTIFICATIONS
// ============================

app.get("/notifications", (req, res) => {

    res.json(notifications)

})


// ============================
// CHATBOT
// ============================

app.post("/chatbot", (req, res) => {

    const { message } = req.body

    let reply = "I'm here to help. Please describe your issue."

    if (message.toLowerCase().includes("password")) {

        reply = "You can reset your password from the IT portal."

    }

    else if (message.toLowerCase().includes("ticket")) {

        reply = "You can create a support ticket from the dashboard."

    }

    else if (message.toLowerCase().includes("status")) {

        reply = "Check your request status in 'My Requests'."

    }

    res.json({
        reply: reply
    })

})


// ============================
// START SERVER
// ============================

const PORT = 5000

app.listen(PORT, () => {

    console.log("ServiceDeskBot Server running on port " + PORT)

})