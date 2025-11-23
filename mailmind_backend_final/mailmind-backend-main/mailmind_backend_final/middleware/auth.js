import jwt from "jsonwebtoken";
export default function auth(req,res,next){
  const header = req.headers.authorization;
  if(!header) return res.status(401).json({ error: "Sem token" });
  const token = header.split(" ")[1];
  if(!token) return res.status(401).json({ error: "Sem token" });
  try {
    const data = jwt.verify(token, process.env.JWT_SECRET);
    req.user = data;
    next();
  } catch(e) {
    return res.status(401).json({ error: "Token inválido" });
  }
}
