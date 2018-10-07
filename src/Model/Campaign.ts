import {FirebaseCommon} from "../Abstract/FirebaseCommon";
import {ICampaignData} from "../Interface/ICampaignData";
import {Roll20Client} from "../Roll20Client";

export class Campaign extends FirebaseCommon<Campaign, ICampaignData, any> {

    public constructor(client: Roll20Client) {
        super(client, "/campaign/", "campaign");
    }

    protected async initData(data: any): Promise<void> {
        this.getClient().getLogger().info("Campaign data", data);
    }
}
