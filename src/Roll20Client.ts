import {Player} from "./Model/Player";
import {Character} from "./Model/Character";
import {ChatMessage} from "./Model/ChatMessage";
import {IChatMessageData} from "./Interface/IChatMessageData";
import {FunctionPoolForReadyEvents} from "./Abstract/FunctionPoolForReadyEvents";
import {ICharacterData} from "./Interface/ICharacterData";
import {IAuthResponse} from "./Interface/IAuthResponse";
import {Campaign} from "./Model/Campaign";
import {NullLogger} from "./Utils/NullLogger";
import {FirebaseCollection} from "./Abstract/FirebaseCollection";
import {Firebase_T} from "./Abstract/FirebaseTypes";
import {IPlayerData} from "./Interface/IPlayerData";
import {ILogger} from "./Interface/ILogger";

const firebase = require("firebase");

export class Roll20Client {
    private _firebase: Firebase_T;
    private _campaign: Campaign;

    private _playerId: string;

    private _characterCollectin: FirebaseCollection<Character, ICharacterData>;
    private _playerCollection: FirebaseCollection<Player, IPlayerData>;
    private _chatMessages: FirebaseCollection<ChatMessage, IChatMessageData>;

    private _readyEvent: FunctionPoolForReadyEvents<() => void>;
    private _ourPlayer: Player | null;

    private _isLoggedIn: boolean = false;
    private _log: ILogger;

    public constructor(campaignUrl: string, logger: ILogger = NullLogger.Singleton) {

        this._log = logger;
        this._log.debug(`Creating new client for campaign ${campaignUrl}`);

        this._readyEvent = new FunctionPoolForReadyEvents("client ready", this._log);

        // @ts-ignore
        this._firebase = new Firebase(campaignUrl, new Firebase.Context());

        this._chatMessages = this._firebase.child("/chat/");
        this._campaign = new Campaign(this);

        this._characterCollectin = new FirebaseCollection<Character, ICharacterData>(
            this,
            "/characters/",
            Character.fromRaw,
            "characters"
        );


        this._playerCollection = new FirebaseCollection<Player, IPlayerData>(
            this,
            "/players/",
            Player.fromRaw,
            "players"
        );

        this._chatMessages = new FirebaseCollection<ChatMessage, IChatMessageData>(
            this,
            "/chat/",
            ChatMessage.fromRaw,
            "chat"
        );

        Promise.all([
            this._characterCollectin.getReadyPromise(),
            this._playerCollection.getReadyPromise(),
            this._chatMessages.getReadyPromise(),
            this._campaign.getReadyPromise(),
        ])
            .then(() => {
                logger.info("We are now ready.");
                this._readyEvent.setReady();
                this._readyEvent.fireAll();
                logger.debug("Ready events have been fired.");
            });
    }

    public login(gntkn: string) {
        this._log.info("Logging in");

        return new Promise<IAuthResponse>((ok, err) => {
            this.getFirebase().authWithCustomToken(gntkn, (e: any, authRoot: IAuthResponse) => {
                this._log.debug("Got auth callback");
                if (e) {
                    this._log.warning("Auth failed", e);
                    err(e);
                    return;
                }

                this._playerId = authRoot.auth.playerid;
                this._isLoggedIn = true;

                this._log.info("Successfully auth'ed");
                ok(authRoot);
            });
        })
    }

    public getLogger() {
        return this._log;
    }

    public isLoggedIn() {
        return this._isLoggedIn;
    }

    public assertLoggedIn() {
        if (!this._isLoggedIn) {
            throw new Error("Client must be logged in to do this operation");
        }
    }

    public campaign() {
        return this.campaign;
    }

    public getCurrentPlayerId() {
        this.assertLoggedIn();

        return this._playerId;
    }

    public getCurrentPlayer(): Player | null {
        this.assertLoggedIn();

        if (!this.players().isReady()) {
            throw new Error("Cannot get current player until the character collection is ready.");
        }

        if (!this._ourPlayer) {
            this._ourPlayer = this.players().getById(this._playerId);
        }

        if (!this._ourPlayer) {
            this._log.critical(`Cannot find local player who has id of ${this._playerId}`);

            // @ts-ignore
            return null;
        }

        return this._ourPlayer;
    }

    public getFirebase() {
        return this._firebase;
    }

    public characters() {
        return this._characterCollectin;
    }

    public players() {
        return this._playerCollection;
    }

    public chat() {
        return this._chatMessages;
    }

    public ready() {
        return this._readyEvent;
    }

    public say(content: string, who: string = "not a bot", type: string = "general") {
        this.assertLoggedIn();

        this._log.debug("say: before promise");
        return new Promise((ok, err) => {
            this._log.debug("say: started promise");

            const fb = this._chatMessages.getFirebase();

            const data = {
                content,
                playerid: this._playerId,
                who,
                type,
            };

            this._log.debug("say: before ref push");
            const ref = fb.push(data, (e: any) => {
                this._log.debug("say: in ref push callback");

                if (e) {
                    this._log.warning(`Failed to send message ${content}`, e);
                    err(e);
                    return;
                }

                // @ts-ignore
                const priority = Firebase.ServerValue.TIMESTAMP;

                this._log.debug("say: before set priority");
                const msgRef = fb.child(ref.key()).setPriority(priority, (e2: any) => {
                    this._log.debug("say: in set priority");
                    if (e2) {
                        this._log.warning(`Failed to set priority of message ${content}`, e2);
                        err(e2);
                        return;
                    }

                    ok(msgRef);
                });
            });
        });
    }
}
