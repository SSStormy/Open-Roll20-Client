export interface IAuthResponse {
    auth: {
        is_gm: boolean;
        playerid: string;
        userid: number;
        token: {
            is_gm: boolean;
            playerid: string;
            userid: number;
            exp: number;
            iat: number;
            aud: string;
            currentcampaign: string;
            auth_time: number;
            iss: string;
        }
        currentcampaign: string;
    }
    expires: number;
    token: string;
    uid: any; // unknown
    privder: string;
}
