import {
    HindenburgPlugin,
    WorkerPlugin,
    EventListener,
    PlayerSetNameEvent,
    Room,
    Worker,
    RoomCreateEvent,
    RoomDestroyEvent,
    RoomSelectHostEvent,
    RoomGameStartEvent,
    RoomGameEndEvent,
    RoomSetPrivacyEvent,
    RoomAssignRolesEvent,
    PlayerJoinEvent,
    PlayerLeaveEvent,
    PlayerSyncSettingsEvent,
    BaseRoom
} from "@skeldjs/hindenburg";
import { ServerHandler } from "./server";
import ejs from "ejs";
import fs from "fs";

@HindenburgPlugin("hbplugin-cockpit")
export class CockpitPlugin extends WorkerPlugin {
    username: string
    password: string
    maxSession: number
    port: number
    updateDelay: number
    serverHandler: ServerHandler

    constructor(worker: Worker, config: any) {
        super(worker, config);

        this.username = config.username;
        this.password = config.password;
        this.maxSession = config.maxSession;
        this.port = config.port;
        this.updateDelay = config.updateDelay;
        this.serverHandler = new ServerHandler(this);
    }

    @EventListener("room.create")
    onRoomCreate(ev: RoomCreateEvent) {
        this.serverHandler.updateDashboard();
        this.serverHandler.updateRoom(ev.room);
    }

    @EventListener("room.destroy")
    onRoomDestroy(ev: RoomDestroyEvent) {
        this.serverHandler.updateDashboard();
        this.serverHandler.updateRoom(ev.room);
    }

    @EventListener("room.setprivacy")
    onRoomSetPrivacy(ev: RoomSetPrivacyEvent) {
        this.serverHandler.updateDashboard();
        this.serverHandler.updateRoom(ev.room);
    }

    @EventListener("room.selecthost")
    onRoomSelectHost(ev: RoomSelectHostEvent) {
        this.serverHandler.updateDashboard();
        this.serverHandler.updateRoom(ev.room);
    }

    @EventListener("room.gamestart")
    onRoomGameStart(ev: RoomGameStartEvent) {
        this.serverHandler.updateDashboard();
        this.serverHandler.updateRoom(ev.room);
    }

    @EventListener("room.gameend")
    onRoomGameEnd(ev: RoomGameEndEvent) {
        this.serverHandler.updateDashboard();
        this.serverHandler.updateRoom(ev.room);
    }

    @EventListener("player.join")
    onPlayerJoin(ev: PlayerJoinEvent) {
        this.serverHandler.updateDashboard();
        this.serverHandler.updateRoom(ev.room);
    }

    @EventListener("player.leave")
    onPlayerLeave(ev: PlayerLeaveEvent) {
        this.serverHandler.updateDashboard();
        this.serverHandler.updateRoom(ev.room);
    }

    @EventListener("player.syncsettings")
    onPlayerSyncSettings(ev: PlayerSyncSettingsEvent) {
        this.serverHandler.updateRoom(ev.room);
    }

    @EventListener("room.assignroles")
    onRoomAssignRoles(ev: RoomAssignRolesEvent) {
        this.serverHandler.updateRoom(ev.room);
    }

    onConfigUpdate(oldConfig: any, newConfig: any) {
        this.username = newConfig.username;
        this.password = newConfig.password;
        this.maxSession = newConfig.maxSession;
        this.updateDelay = newConfig.updateDelay;
    }
}
