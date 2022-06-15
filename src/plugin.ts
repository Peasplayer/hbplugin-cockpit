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
    BaseRoom,
    PlayerSetRoleEvent,
    RoleType,
    PlayerMurderEvent,
    PlayerDieEvent,
    GameDataRemovePlayerEvent
} from "@skeldjs/hindenburg";
import { ServerHandler } from "./server";
import ejs from "ejs";
import fs from "fs";
import { RoomLogger } from "./roomLogger";
import { LogEntry } from "./logEntry";

@HindenburgPlugin("hbplugin-cockpit")
export class CockpitPlugin extends WorkerPlugin {
    username: string
    password: string
    maxSession: number
    port: number
    updateDelay: number
    roomLoggers: Map<number, RoomLogger>
    serverHandler: ServerHandler

    constructor(worker: Worker, config: any) {
        super(worker, config);

        this.username = config.username;
        this.password = config.password;
        this.maxSession = config.maxSession;
        this.port = config.port;
        this.updateDelay = config.updateDelay;
        this.roomLoggers = new Map<number, RoomLogger>();
        this.serverHandler = new ServerHandler(this);
    }

    @EventListener("room.create")
    onRoomCreate(ev: RoomCreateEvent) {
        this.roomLoggers.set(ev.room.code, new RoomLogger(ev.room.code))
        this.roomLoggers.get(ev.room.code)?.appendLogEntry(new LogEntry("System", "Room got created"));
        this.serverHandler.updateDashboard();
        this.serverHandler.updateRoom(ev.room);
    }

    @EventListener("room.destroy")
    onRoomDestroy(ev: RoomDestroyEvent) {
        this.roomLoggers.delete(ev.room.code)
        this.serverHandler.updateDashboard();
        this.serverHandler.updateRoom(ev.room);
    }

    @EventListener("room.setprivacy")
    onRoomSetPrivacy(ev: RoomSetPrivacyEvent<Room>) {
        this.roomLoggers.get(ev.room.code)?.appendLogEntry(new LogEntry("System", "Room's privacy was set to " + ev.newPrivacy.charAt(0).toUpperCase() + ev.newPrivacy.slice(1)));
        this.serverHandler.updateDashboard();
        this.serverHandler.updateRoom(ev.room);
    }

    @EventListener("room.selecthost")
    onRoomSelectHost(ev: RoomSelectHostEvent) {
        this.roomLoggers.get(ev.room.code)?.appendLogEntry(new LogEntry("System", "Room's host was set to " + ev.selected.username));
        this.serverHandler.updateDashboard();
        this.serverHandler.updateRoom(ev.room);
    }

    @EventListener("room.gamestart")
    onRoomGameStart(ev: RoomGameStartEvent) {
        this.roomLoggers.get(ev.room.code)?.appendLogEntry(new LogEntry("Game", "Game started"));
        this.serverHandler.updateDashboard();
        this.serverHandler.updateRoom(ev.room);
    }

    @EventListener("room.gameend")
    onRoomGameEnd(ev: RoomGameEndEvent) {
        this.roomLoggers.get(ev.room.code)?.appendLogEntry(new LogEntry("Game", "Game ended"));
        this.serverHandler.updateDashboard();
        this.serverHandler.updateRoom(ev.room);
    }

    @EventListener("player.setname")
    onPlayerJoin(ev: PlayerSetNameEvent<Room>) {
        this.roomLoggers.get(ev.room.code)?.appendLogEntry(new LogEntry("Player", (ev.player.playerInfo?.defaultOutfit.name ?? ev.newName) + " joined the room"))
        this.serverHandler.updateDashboard();
        this.serverHandler.updateRoom(ev.room);
    }

    @EventListener("gamedata.removeplayer")
    onPlayerLeave(ev: GameDataRemovePlayerEvent<Room>) {
        this.roomLoggers.get(ev.room.code)?.appendLogEntry(new LogEntry("Player", (ev.player.playerInfo?.defaultOutfit.name ?? ev.player.username) + " left the room"));
        this.serverHandler.updateDashboard();
        this.serverHandler.updateRoom(ev.room);
    }

    @EventListener("player.murder")
    onPlayerMurder(ev: PlayerMurderEvent<Room>) {
        this.serverHandler.addRoomLog(ev.room, new LogEntry("Player", (ev.player.playerInfo?.defaultOutfit.name ?? ev.player.username) + " murdered " + (ev.victim.playerInfo?.defaultOutfit.name ?? ev.victim.username)));
    }

    @EventListener("player.die")
    onPlayerDie(ev: PlayerDieEvent<Room>) {
        this.serverHandler.addRoomLog(ev.room, new LogEntry("Player", (ev.player.playerInfo?.defaultOutfit.name ?? ev.player.username) + " died because " + ev.reason));
    }

    @EventListener("player.syncsettings")
    onPlayerSyncSettings(ev: PlayerSyncSettingsEvent<Room>) {
        this.serverHandler.updateRoom(ev.room);
    }

    @EventListener("player.setrole")
    onPlayerSetRole(ev: PlayerSetRoleEvent<Room>) {
        this.serverHandler.addRoomLog(ev.room, new LogEntry("Game", ev.player.playerInfo?.defaultOutfit.name + "'s role was set to " + RoleType[ev.newRole.roleMetadata.roleType]));
        this.serverHandler.updateRoom(ev.room);
    }

    onConfigUpdate(oldConfig: any, newConfig: any) {
        this.username = newConfig.username;
        this.password = newConfig.password;
        this.maxSession = newConfig.maxSession;
        this.updateDelay = newConfig.updateDelay;
    }
}
