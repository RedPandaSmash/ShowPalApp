import user from "../models/user.model.js"
import {router} from "express"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"

router.post("/signup", async (req, res)=> {
    const {email, password, username} = req.body

    try {
        const newUser = new User({
            email,
            password: await bcrypt.hash(password, 10),
            username
        })

        const savedUser = await newUser.save()

        const token = jwt.sign(
            {
                id:savedUser._id
            },
            process.env.JWT_SECRET,
            {expiresIn:"24h"}
        ) 
        res.json({
            message:"User made successfully",
            savedUser,
            token
        })
    } catch (error) {
        console.error(error)
    }
})

router.post("/login",async (req, res) => {
    const email = req.body.email
    const password = req.body.password

    const foundUser =  await User.findOne({email})
    const verifyPwd = await bcrypt.compare(password, foundUser.password)

    if (!foundUser || !verifyPwd) {
        return res.status(401).json({
            error:"invalid password or email"
        })
    }
})