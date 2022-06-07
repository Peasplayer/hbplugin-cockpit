import {
    GameCode,
    GameMap,
    GameKeyword,
    KillDistance,
    TaskBarUpdate,
} from "@skeldjs/hindenburg";
import { CockpitPlugin } from "./plugin";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import path from "path";
import argon2 from "argon2";
import express from "express";
import http from "http";
import { Server } from "socket.io";
import ejs from "ejs";
import fs from "fs";

export class ServerHandler {
    plugin: CockpitPlugin
    app = express();
    server = http.createServer(this.app);
    io = new Server(this.server);

    constructor(protected readonly myPlugin: CockpitPlugin) {
        this.plugin = myPlugin;
        this.initServer();
    }

    initServer() {
        this.app.use(bodyParser.urlencoded({ extended: false }));
        this.app.use(bodyParser.json());
        this.app.use(cookieParser("7h7XBKWsQaCmQ5dwF39D8H89FYd6NwnL2ecxev7nXxeZ3zgV")); //I know that it's very clever to create a secret and make it open source
        this.app.set("view engine", "ejs");
        this.app.set("views", path.resolve(this.plugin.baseDirectory, "./views"));

        this.app.get("/", async (req, res) => {
            if (await this.isLoggedIn(req))
                res.redirect("/dashboard");
            else
                res.render("Login");
        });

        this.app.get("/logout", async (req, res) => {
            res.clearCookie("username");
            res.clearCookie("password");
            res.render("Message", { message: "You have been logged out!", buttonText: "Go to Login", buttonLink: "/", isError: false });
        });

        this.app.all("/dashboard", async (req, res) => {
            if (await this.isLoggedIn(req)) {
                var options = { secure: true, signed: true, maxAge: undefined as unknown as number }
                if (req.body.stayLoggedIn === "on")
                    options.maxAge = 1000 * 60 * 60 * 24 * this.plugin.maxSession;

                if (req.body.username !== undefined && req.body.password !== undefined) {
                    res.cookie("username", req.body.username, options);
                    res.cookie("password", await argon2.hash(req.body.username + "_" + req.body.password), options);
                }

                res.render("Dashboard", { rooms: this.plugin.worker.rooms, defaultPassword: this.plugin.password === "Password123", GameCode: GameCode });
            }
            else
                res.render("Message", { message: "You are not logged in!\nLog in to access this page", buttonText: "Go to Login", buttonLink: "/", isError: true });
        });

        this.app.get("/room", async (req, res) => {
            if (await this.isLoggedIn(req)) {
                const room = this.plugin.worker.rooms.get(parseInt(req.query.code as string));
                if (req.query.code === undefined || room === undefined) {
                    return res.render("Message", { message: "Room not found!", buttonText: "Go Back", buttonLink: "/dashboard", isError: true });
                }

                res.render("Room", { room: room, GameCode: GameCode, GameMap: GameMap, GameKeyword: GameKeyword, KillDistance: KillDistance, TaskBarUpdate: TaskBarUpdate });
            }
            else
                res.render("Message", { message: "You are not logged in!\nLog in to access this page", buttonText: "Go to Login", buttonLink: "/", isError: true });
        });

        this.app.post("/room/close", async (req, res) => {
            if (await this.isLoggedIn(req)) {
                const room = this.plugin.worker.rooms.get(parseInt(req.query.code as string));
                if (req.query.code === undefined || room === undefined) {
                    return res.render("Message", { message: "Room not found!", buttonText: "Go Back", buttonLink: "/dashboard", isError: true });
                }

                room.connections.forEach(connection => {
                    connection.disconnect(req.body.closeReason as unknown as string);
                });

                res.render("Message", { message: "Room was closed", buttonText: "Go Back", buttonLink: "/dashboard", isError: false });
            }
            else
                res.render("Message", { message: "You are not logged in!\nLog in to access this page", buttonText: "Go to Login", buttonLink: "/", isError: true });
        });

        this.app.post("/room/chat", async (req, res) => {
            if (await this.isLoggedIn(req)) {
                const room = this.plugin.worker.rooms.get(parseInt(req.query.code as string));
                if (req.query.code === undefined || room === undefined) {
                    return res.render("Message", { message: "Room not found!", buttonText: "Go Back", buttonLink: "/dashboard", isError: true });
                }

                room.sendChat(req.body.message);

                res.redirect("/room?code=" + room.code);
            }
            else
                res.render("Message", { message: "You are not logged in!\nLog in to access this page", buttonText: "Go to Login", buttonLink: "/", isError: true });
        });

        this.app.get("/room/kick", async (req, res) => {
            if (await this.isLoggedIn(req)) {
                const room = this.plugin.worker.rooms.get(parseInt(req.query.code as string));
                if (req.query.code === undefined || room === undefined) {
                    return res.render("Message", { message: "Room not found!", buttonText: "Go Back", buttonLink: "/dashboard", isError: true });
                }

                room.connections.get(parseInt(req.query.player as string))?.disconnect(req.query.message as string ?? "You were kicked by the server");

                res.redirect("/room?code=" + room.code);
            }
            else
                res.render("Message", { message: "You are not logged in!\nLog in to access this page", buttonText: "Go to Login", buttonLink: "/", isError: true });
        });

        this.server.listen(this.plugin.port, () => {
            this.plugin.logger.info("Cockpit is online on port %s!", this.plugin.port);
        });
    }

    updateDashboard() {
        setTimeout(() => {
            try {
                this.io.sockets.emit('update-dashboard',
                    { data: ejs.render("<body>" + fs.readFileSync(path.resolve(this.plugin.baseDirectory, "./views/Dashboard.ejs"), "utf8").split("<body>")[1].split("</body>")[0] + "</body>",
                            { rooms: this.plugin.worker.rooms, defaultPassword: this.plugin.password === "Password123", GameCode: GameCode }) });
            }
            catch(err) {
                this.io.sockets.emit('update-dashboard',
                    { data: ejs.render("<body>" + fs.readFileSync(path.resolve(this.plugin.baseDirectory, "./views/Message.ejs"), "utf8").split("<body>")[1].split("</body>")[0] + "</body>",
                            { message: "There was an error whilest rendering the update if the page! If this continues to happen, increase the update delay.", buttonText: "Reload Page", buttonLink: "/", isError: true }) });
            }
        }, 1000 * this.plugin.updateDelay);
    }

    updateRoom(room: any) {
        setTimeout(() => {
            try {
                this.io.sockets.emit('update-room-' + room.code,
                    { data: ejs.render("<body>" + fs.readFileSync(path.resolve(this.plugin.baseDirectory, "./views/Room.ejs"), "utf8").split("<body>")[1].split("</body>")[0] + "</body>",
                            { room: room, GameCode: GameCode, GameMap: GameMap, GameKeyword: GameKeyword, KillDistance: KillDistance, TaskBarUpdate: TaskBarUpdate }) });
            }
            catch(err) {
                this.io.sockets.emit('update-dashboard',
                    { data: ejs.render("<body>" + fs.readFileSync(path.resolve(this.plugin.baseDirectory, "./views/Message.ejs"), "utf8").split("<body>")[1].split("</body>")[0] + "</body>",
                            { message: "There was an error whilest rendering the update if the page! If this continues to happen, increase the update delay.", buttonText: "Reload Page", buttonLink: "/", isError: true }) });
            }
        }, 1000 * this.plugin.updateDelay);
    }

    async isLoggedIn(req: any) {
        return (req.body.username === this.plugin.username || req.signedCookies.username === this.plugin.username)
            && (req.body.password === this.plugin.password || await argon2.verify(req.signedCookies.password, this.plugin.username + "_" + this.plugin.password));
    }
}
