import Users from "../models/usermodel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

// Get all users
async function getUser(req, res) {
  try {
    const users = await Users.findAll({
      attributes: ['id', 'email', 'username'] // Exclude sensitive fields
    });
    res.status(200).json(users);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ 
      status: "Error", 
      message: error.message 
    });
  }
}

// Register new user
export const register = async(req, res) => {
    const { name, email, password, confPassword } = req.body;
    if(password !== confPassword) return res.status(400).json({msg: "Password dan Confirm Password tidak cocok"});
    const salt = await bcrypt.genSalt();
    const hashPassword = await bcrypt.hash(password, salt);
    try {
        await Users.create({
            name: name,
            email: email,
            password: hashPassword,
            role: "customer"
        });
        res.json({msg: "Register Berhasil"});
    } catch (error) {
        console.log(error);
        res.status(500).json({msg: error.message});
    }
}

export const login = async(req, res) => {
    try {
        const user = await Users.findOne({
            where: {
                email: req.body.email
            }
        });
        if(!user) return res.status(404).json({msg: "User tidak ditemukan"});
        const match = await bcrypt.compare(req.body.password, user.password);
        if(!match) return res.status(400).json({msg: "Wrong Password"});
        
        const userId = user.id;
        const name = user.name;
        const email = user.email;
        const role = user.role;
        
        const accessToken = jwt.sign({userId, name, email, role}, process.env.ACCESS_TOKEN_SECRET, {
            expiresIn: '20s'
        });
        const refreshToken = jwt.sign({userId, name, email, role}, process.env.REFRESH_TOKEN_SECRET, {
            expiresIn: '1d'
        });
        
        await Users.update({refresh_token: refreshToken}, {
            where: {
                id: userId
            }
        });
        
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000
        });
        
        res.json({ accessToken });
    } catch (error) {
        res.status(500).json({msg: error.message});
    }
}

export const logout = async(req, res) => {
    const refreshToken = req.cookies.refreshToken;
    if(!refreshToken) return res.sendStatus(204);
    const user = await Users.findOne({
        where: {
            refresh_token: refreshToken
        }
    });
    if(!user) return res.sendStatus(204);
    await Users.update({refresh_token: null}, {
        where: {
            id: user.id
        }
    });
    res.clearCookie('refreshToken');
    return res.sendStatus(200);
}

export { getUser };