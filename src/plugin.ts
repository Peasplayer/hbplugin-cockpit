import {
    HindenburgPlugin,
    WorkerPlugin,
    EventListener,
    PlayerSetNameEvent,
    Room,
    Worker,
    GameCode,
    GameMap,
    GameKeyword,
    KillDistance,
    TaskBarUpdate
} from "@skeldjs/hindenburg";
import express from "express";
import bodyParser from "body-parser" ;
import cookieParser from "cookie-parser";
import path from "path";
import ejs from "ejs";
import argon2 from "argon2";

@HindenburgPlugin("hbplugin-cockpit")
export class CockpitPlugin extends WorkerPlugin {
    username: string
    password: string
    maxSession: number
    port: number
    app = express();

    constructor(worker: Worker, config: any) {
        super(worker, config);

        this.username = config.username;
        this.password = config.password;
        this.maxSession = config.maxSession;
        this.port = config.port;
    }

    async onPluginLoad() {
        this.app.use(bodyParser.urlencoded({ extended: false }));
        this.app.use(bodyParser.json());
        this.app.use(cookieParser("7h7XBKWsQaCmQ5dwF39D8H89FYd6NwnL2ecxev7nXxeZ3zgV")); //I know that it's very clever to create a secret and make it open source
        this.app.set("view engine", "ejs");
        this.app.set("views", path.resolve(this.baseDirectory, "./views"));

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
                    options.maxAge = 1000 * 60 * 60 * 24 * this.maxSession;

                if (req.body.username !== undefined && req.body.password !== undefined) {
                    res.cookie("username", req.body.username, options);
                    res.cookie("password", await argon2.hash(req.body.username + "_" + req.body.password), options);
                }

                res.render("Dashboard", { rooms: this.worker.rooms, defaultPassword: this.password === "Password123", GameCode: GameCode });
            }
            else
                res.render("Message", { message: "You are not logged in!\nLog in to access this page", buttonText: "Go to Login", buttonLink: "/", isError: true });
        });

        this.app.get("/room", async (req, res) => {
            if (await this.isLoggedIn(req)) {
                const room = this.worker.rooms.get(parseInt(req.query.code as string));
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
                const room = this.worker.rooms.get(parseInt(req.query.code as string));
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
                const room = this.worker.rooms.get(parseInt(req.query.code as string));
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
                const room = this.worker.rooms.get(parseInt(req.query.code as string));
                if (req.query.code === undefined || room === undefined) {
                    return res.render("Message", { message: "Room not found!", buttonText: "Go Back", buttonLink: "/dashboard", isError: true });
                }

                room.connections.get(parseInt(req.query.player as string))?.disconnect(req.query.message as string ?? "You were kicked by the server");

                res.redirect("/room?code=" + room.code);
            }
            else
                res.render("Message", { message: "You are not logged in!\nLog in to access this page", buttonText: "Go to Login", buttonLink: "/", isError: true });
        });

        this.app.listen(this.port, () => {
            this.logger.info("Cockpit is online on port %s!", this.port);
        });
    }

    onConfigUpdate(oldConfig: any, newConfig: any) {
        this.username = newConfig.username;
        this.password = newConfig.password;
        this.maxSession = newConfig.maxSession;
    }

    async isLoggedIn(req: any) {
        return (req.body.username === this.username || req.signedCookies.username === this.username) && (req.body.password === this.password || await argon2.verify(req.signedCookies.password, this.username + "_" + this.password));
    }
}
