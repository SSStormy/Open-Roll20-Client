import {IBaseLowData} from "./IBaseLowData";

export interface IPlayerData extends IBaseLowData {
    color?: string;
    d20userid?: string;
    d20username?: string;
    displayname?: string;
    online?: boolean;
    speakingas?: string;
    chatbeepenabled?: boolean;
    globalvolume?: number;
    advShortcuts?: boolean; // @NO-API
    adv_fow_revealed?: string; // @NO-API
    alphatokenactions?: boolean; // @NO-API
    apptddiceenabled?: boolean; // @NO-API
    bigsearchstyle?: boolean; // @NO-API
    chatavatarsenabled?: boolean; // @NO-API
    chattimestampsenabled?: boolean; // @NO-API
    diceiconsenabled?: boolean; // @NO-API
    disableagency?: boolean; // @NO-API

    journalfolderstatus?: string; // @NO-API
    jukeboxfolderstatus?: string; // @NO-API
    lastActive?: number; // @NO-API
    lastpage?: string; // @NO-API
    librarytab?: string; // @NO-API
    macrobar?: string; // @NO-API
    recentuploadsfilter?: boolean; // @NO-API
    showmacrobar?: boolean; // @NO-API
    tddiceenabled?: boolean; // @NO-API
    usePopouts?: boolean; // @NO-API
    videobroadcasttype?: string; // @NO-API
    videoplayerlocation?: string; // @NO-API
    videoplayersize?: string; // @NO-API
    videoreceivetype?: string; // @NO-API
}
