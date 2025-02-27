// controllers/hoots.js

const express = require('express');
const verifyToken = require('../middleware/verify-token.js');
const Hoot = require('../models/hoot.js');

const router = express.Router();

// ========== Public Routes ===========

router.use(verifyToken);

router.get('/', async (req, res) => {
    try {
        const hoots = await Hoot.find({}).populate('author').sort({ createdAt: 'desc' });
        res.status(200).json(hoots);
    } catch (error) {
        res.status(500).json(error);
    }
});

router.get('/:hootId', async (req, res) => {
    try {
        const hoot = await Hoot.findById(req.params.hootId).populate(['author', 'comments.author']);

        res.status(200).json(hoot);
    } catch (error) {
        res.status(500).json(error);
    }
});

// ========= Protected Routes =========

router.post('/', async (req, res) => {
    try {
        // Get the data from the form submitted,
        // but add the user as the author, since that is not an option on the form
        req.body.author = req.user._id;

        // Create the new hoot in the database
        const hoot = await Hoot.create(req.body);

        // instead of using populate to call the databse, just attach
        // the user object from the parsed token
        hoot._doc.author = req.user;

        res.status(201).json(hoot);
    } catch (error) {
        console.log(error);
        res.status(500).json(error);
    }
});

router.put('/:hootId', async (req, res) => {
    try {
        // Find the hoot:
        const hoot = await Hoot.findById(req.params.hootId);

        // Check permissions:
        if (!hoot.author.equals(req.user._id)) {
            return res.status(403).send("You're not allowed to do that!");
        }

        // Update hoot:
        const updatedHoot = await Hoot.findByIdAndUpdate(req.params.hootId, req.body, { new: true });

        // Append req.user to the author property:
        updatedHoot._doc.author = req.user;

        // Issue JSON response:
        res.status(200).json(updatedHoot);
    } catch (error) {
        res.status(500).json(error);
    }
});

router.delete('/:hootId', async (req, res) => {
    try {
        const hoot = await Hoot.findById(req.params.hootId);

        if (!hoot.author.equals(req.user._id)) {
            return res.status(403).send("You're not allowed to do that!");
        }

        const deletedHoot = await Hoot.findByIdAndDelete(req.params.hootId);
        res.status(200).json(deletedHoot);
    } catch (error) {
        console.log(error);
        res.status(500).json(error);
    }
});

// Comments

router.post('/:hootId/comments', async (req, res) => {
    try {
        console.log(req.user._id);
        console.log(req.user);
        // the person signed in is the author of this comment
        req.body.author = req.user._id;

        // find the hoot that this comment will belong to
        const hoot = await Hoot.findById(req.params.hootId);

        // Add the new comment to the comments array on the hoot
        hoot.comments.push(req.body);

        // save the base hoot model since comments is embedded
        await hoot.save();

        // Find the newly created comment:
        const newComment = hoot.comments[hoot.comments.length - 1];

        newComment._doc.author = req.user;

        // Respond with the newComment:
        res.status(201).json(newComment);
    } catch (error) {
        res.status(500).json(error);
    }
});

router.put('/:hootId/comments/:commentId', async (req, res) => {
    try {
        const hoot = await Hoot.findById(req.params.hootId);
        const comment = hoot.comments.id(req.params.commentId);
        comment.text = req.body.text;
        await hoot.save();
        res.status(200).json({ message: 'Ok' });
    } catch (err) {
        res.status(500).json(err);
    }
});

router.delete('/:hootId/comments/:commentId', async (req, res) => {
    try {
        const hoot = await Hoot.findById(req.params.hootId);
        hoot.comments.remove({ _id: req.params.commentId });
        await hoot.save();
        res.status(200).json({ message: 'Ok' });
    } catch (err) {
        res.status(500).json(err);
    }
});

module.exports = router;