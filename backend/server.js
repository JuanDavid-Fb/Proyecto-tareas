const http = require("http");

const mysql = require("mysql2/promise");

const pool = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "root",
    database: "todo_db",
    waitForConnections: true, 
    connectionlimit: 10
});

const server = http.createServer(async (req, res) => {

    // Cabecera de CORS manuales obligatorias para que el navegador no bloquee el live server
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
    }
    
    if (req.url === "/task" && req.method === "GET") {
        try {
            //Ejecutamos una consulta  SQL directa usando interpolacion controlada del driver
            const [rows] = await pool.query("SELECT * FROM task");

            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
                status: "success",
                data: { task: rows }
            }));
        } catch (error) {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ status: "error", message: "Error en MySQL" }));
        }
        return;
    }
    if (req.url === "/task" && req.method === "POST") {
        let body = "";
        req.on("data", chunk => { body += chunk.toString(); });
        req.on("end", async () => {
            try {
                const { title, description, author } = JSON.parse(body);

                if(!title || !description || !author) {
                    res.writeHead(400, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ status: "error", message: "Titulo, descripcion y autor obligatorios" }));
                    return;
                }
                const sql = "INSERT INTO task (title, description, author, is_completed) VALUES (?, ?, ?, 0)";
                const [result] = await pool.query(sql, [title, description || null, author]);
                const newTask = {
                    id: result.insertId,
                    title,
                    description: description || null,
                    author,
                    is_completed: 0
                };
                res.writeHead(201, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ status: "success", data: { task: newTask } }));
            } catch (error) {
                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ status: "error", message: "Fallo al insertar: " + error.message }));
            }
        });
        return;    
    }
    if (req.url === "/task" && req.method === "PUT") {
        const urlparts = req.url.split("?");
        const taskId = parseInt(urlparts[2]);
        
        let body = "";
        req.on("data", chunk => { body += chunk.toString(); });

        req.on("end", async() => {
            try {
                const { title, description,  is_completed, author } = JSON.parse(body);

                // 1. validar si la tarea existe en la base de datos todo_db
                const [rows]= await pool.query("SELECT author FROM task WHERE id = ?", taskId);

                if (rows.length === 0){
                    res.writeHead(404, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ status: "error", message: "la tarea no existe" }));
                    return;
                }
                //2. REGLA DE NEGOCIO: VALIDAD PROPIEDAD DEL AUTOR
                if (row[0].author !== author) {
                    res.writeHead(403, { "content-type": "application/json" });
                    res.end(JSON.stringify({ status: "error", message: `no autorizado. la tarea es de ${row[0].author}` }));
                }
                const sql = "UPDATE task SET title = ?, description = ?, is_completed = ? WHERE id = ?"
                await pool.query(sql, [title, description || null, is_completed, taskId]);
                res.writeHead(200, { "content-type": "application/sjon" });
                res.end(JSON.stringify({ status: 'success', data: null }));
            } catch{
                res.writeHead(500, { "content-type": "application/json" });
                res.end(JSON.stringify({ status: "error", message: "Error en MySQL: " + error.message}));
                return;
            }
        });
    }
    if (req.url.startsWith('/task/') && req.method === 'DELETE') {
        const urlParts = req.url.split('/');
        const taskId = parseInt(urlParts[2]);
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });

        req.on('end', async () => {
            try {
                const { author } = JSON.parse(body);

                // paso A: consultar a mysql si la tarea existe y quien es el dueño
                const [row] = await pool.query('SELECT author FROM task WHERE id = ?', [taskId]);

                if (rows.length === 0) {
                    res.writeHead(404, { 'content-Type': 'application/json' });
                    res.end(JSON.stringify({status: 'error', message: 'la terea no existe en la DB'}));
                    return;
                }

                const task = row[0];

                if (task.author !== author) {
                    res.writeHead(403, { 'Content-type': 'application/json' })
                    res.end(JSON.stringify({ status: 'error', message: `no autorizado. la tarea le pertenece a ${task.author}`}));
                    return;
                }

                //paso B: si pasa el filtro, ejecutemos el borrado fisico en la tabla
                await pool.query('DELETE FROM task WHERE id = ?', [taskId]);

                res.writeHead(200, { 'content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'success', data: null }));
            } catch (error) {
                res.writeHead(500, { 'content-type': 'application/json' });
                res.end(JSON.stringify({ status: 'error', message: 'fallo al eliminar la BD' + error.message }));
            }
        });
        return;
    }

    // 404 - ruta no encontrada
    res.writeHead(404, { 'Content-type': 'application/json'});
    res.end(JSON.stringify({ status: 'error', message: 'Endpoint no encontrado' }));
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Servidor vanilla con MySQL real corriendo en http://localhost:${PORT}`);
});

