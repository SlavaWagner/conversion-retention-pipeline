import axios from 'axios';

/**
 * Helper to build headers for Google Ads API requests
 * @param {object} config - Configuration object
 * @param {string} accessToken - Current OAuth2 access token
 * @returns {object} Headers dictionary
 */
function getHeaders(config, accessToken) {
  const headers = {
    'Content-Type': 'application/json',
    'developer-token': config.developerToken,
    'Authorization': `Bearer ${accessToken}`
  };

  if (config.loginCustomerId) {
    headers['login-customer-id'] = config.loginCustomerId.replace(/-/g, '');
  }

  return headers;
}

/**
 * Fetches enabled Responsive Search Ads (RSAs) with their performance metrics.
 * @param {object} config - Configuration object
 * @param {string} accessToken - Current OAuth2 access token
 * @returns {Promise<Array>} List of RSAs
 */
export async function fetchSearchCampaignAds(config, accessToken) {
  const customerId = config.customerId.replace(/-/g, '');
  const url = `https://googleads.googleapis.com/${config.googleAdsVersion}/customers/${customerId}/googleAds:searchStream`;

  const query = `
    SELECT
      ad_group_ad.ad.id,
      ad_group_ad.ad.responsive_search_ad.headlines,
      ad_group_ad.ad.responsive_search_ad.descriptions,
      ad_group_ad.ad.final_urls,
      ad_group.id,
      campaign.id,
      campaign.name,
      metrics.conversions,
      metrics.clicks,
      metrics.impressions
    FROM ad_group_ad
    WHERE ad_group_ad.status = 'ENABLED'
      AND ad_group.status = 'ENABLED'
      AND campaign.status = 'ENABLED'
      AND ad_group_ad.ad.type = 'RESPONSIVE_SEARCH_AD'
  `.replace(/\s+/g, ' ').trim();

  try {
    const response = await axios.post(url, { query }, {
      headers: getHeaders(config, accessToken)
    });

    let ads = [];
    if (Array.isArray(response.data)) {
      for (const chunk of response.data) {
        if (chunk.results && Array.isArray(chunk.results)) {
          ads.push(...chunk.results);
        }
      }
    }

    return ads.map(item => {
      const ad = item.adGroupAd?.ad || {};
      const campaign = item.campaign || {};
      const metrics = item.metrics || {};
      return {
        id: ad.id,
        campaignId: campaign.id,
        campaignName: campaign.name,
        headlines: ad.responsiveSearchAd?.headlines?.map(h => h.text) || [],
        descriptions: ad.responsiveSearchAd?.descriptions?.map(d => d.text) || [],
        finalUrls: ad.finalUrls || [],
        metrics: {
          conversions: parseFloat(metrics.conversions || '0'),
          clicks: parseInt(metrics.clicks || '0', 10),
          impressions: parseInt(metrics.impressions || '0', 10)
        }
      };
    });
  } catch (error) {
    const errorDetails = error.response ? JSON.stringify(error.response.data) : error.message;
    throw new Error(`Google Ads searchStream RSA ads error: ${errorDetails}`);
  }
}

/**
 * Fetches enabled Performance Max text assets (headlines & descriptions) with performance labels.
 * @param {object} config - Configuration object
 * @param {string} accessToken - Current OAuth2 access token
 * @returns {Promise<Array>} List of PMax text assets
 */
export async function fetchPMaxCampaignAssets(config, accessToken) {
  const customerId = config.customerId.replace(/-/g, '');
  const url = `https://googleads.googleapis.com/${config.googleAdsVersion}/customers/${customerId}/googleAds:searchStream`;

  const query = `
    SELECT
      asset_group.id,
      asset_group.name,
      campaign.id,
      campaign.name,
      asset_group_asset.asset,
      asset_group_asset.field_type,
      asset_group_asset.performance_label,
      asset.id,
      asset.text_asset.text
    FROM asset_group_asset
    WHERE campaign.status = 'ENABLED'
      AND asset_group.status = 'ENABLED'
      AND asset_group_asset.field_type IN ('HEADLINE', 'DESCRIPTION')
  `.replace(/\s+/g, ' ').trim();

  try {
    const response = await axios.post(url, { query }, {
      headers: getHeaders(config, accessToken)
    });

    let assets = [];
    if (Array.isArray(response.data)) {
      for (const chunk of response.data) {
        if (chunk.results && Array.isArray(chunk.results)) {
          assets.push(...chunk.results);
        }
      }
    }

    return assets.map(item => {
      const asset = item.asset || {};
      const aga = item.assetGroupAsset || {};
      const ag = item.assetGroup || {};
      const campaign = item.campaign || {};
      return {
        id: asset.id,
        campaignId: campaign.id,
        campaignName: campaign.name,
        assetGroupName: ag.name,
        fieldType: aga.fieldType, // 'HEADLINE' or 'DESCRIPTION'
        performanceLabel: aga.performanceLabel || 'LEARNING', // 'BEST', 'GOOD', 'LOW'
        text: asset.textAsset?.text || ''
      };
    });
  } catch (error) {
    const errorDetails = error.response ? JSON.stringify(error.response.data) : error.message;
    throw new Error(`Google Ads searchStream PMax assets error: ${errorDetails}`);
  }
}
