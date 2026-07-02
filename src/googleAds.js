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
 * Fetch RSA Asset Performance (Query A for RSA)
 */
export async function fetchRsaAssetPerformance(config, accessToken) {
  const customerId = config.customerId.replace(/-/g, '');
  const url = `https://googleads.googleapis.com/v24/customers/${customerId}/googleAds:searchStream`;

  const query = `
    SELECT
      ad_group.id,
      ad_group.name,
      asset.id,
      asset.text_asset.text,
      ad_group_ad_asset_view.field_type,
      ad_group_ad_asset_view.performance_label,
      campaign.id,
      campaign.name,
      ad_group_ad.ad.final_urls
    FROM ad_group_ad_asset_view
    WHERE ad_group_ad.ad.type = 'RESPONSIVE_SEARCH_AD'
      AND ad_group_ad_asset_view.field_type IN ('HEADLINE', 'DESCRIPTION')
      AND campaign.advertising_channel_type = 'SEARCH'
      AND campaign.status = 'ENABLED'
      AND ad_group.status = 'ENABLED'
  `.replace(/\s+/g, ' ').trim();

  try {
    const response = await axios.post(url, { query }, {
      headers: getHeaders(config, accessToken)
    });

    let results = [];
    if (Array.isArray(response.data)) {
      for (const chunk of response.data) {
        if (chunk.results && Array.isArray(chunk.results)) {
          results.push(...chunk.results);
        }
      }
    }

    return results.map(item => ({
      adGroupId: item.adGroup?.id,
      adGroupName: item.adGroup?.name,
      assetId: item.asset?.id,
      text: item.asset?.textAsset?.text || '',
      fieldType: item.adGroupAdAssetView?.fieldType,
      performanceLabel: item.adGroupAdAssetView?.performanceLabel || 'LEARNING',
      campaignId: item.campaign?.id,
      campaignName: item.campaign?.name,
      finalUrls: item.adGroupAd?.ad?.finalUrls || []
    }));
  } catch (error) {
    const errorDetails = error.response ? JSON.stringify(error.response.data) : error.message;
    throw new Error(`Google Ads fetchRsaAssetPerformance error: ${errorDetails}`);
  }
}

/**
 * Fetch Ad Group Performance (Query B for RSA)
 */
export async function fetchAdGroupPerformance(config, accessToken) {
  const customerId = config.customerId.replace(/-/g, '');
  const url = `https://googleads.googleapis.com/v24/customers/${customerId}/googleAds:searchStream`;

  const query = `
    SELECT
      ad_group.id,
      ad_group.name,
      campaign.id,
      metrics.impressions,
      metrics.clicks,
      metrics.conversions,
      metrics.conversions_value,
      metrics.cost_micros
    FROM ad_group
    WHERE campaign.advertising_channel_type = 'SEARCH'
      AND segments.date DURING LAST_90_DAYS
      AND ad_group.status = 'ENABLED'
  `.replace(/\s+/g, ' ').trim();

  try {
    const response = await axios.post(url, { query }, {
      headers: getHeaders(config, accessToken)
    });

    let results = [];
    if (Array.isArray(response.data)) {
      for (const chunk of response.data) {
        if (chunk.results && Array.isArray(chunk.results)) {
          results.push(...chunk.results);
        }
      }
    }

    return results.map(item => ({
      adGroupId: item.adGroup?.id,
      adGroupName: item.adGroup?.name,
      campaignId: item.campaign?.id,
      conversions: parseFloat(item.metrics?.conversions || '0'),
      conversionsValue: parseFloat(item.metrics?.conversionsValue || '0'),
      clicks: parseInt(item.metrics?.clicks || '0', 10),
      impressions: parseInt(item.metrics?.impressions || '0', 10),
      costMicros: parseInt(item.metrics?.costMicros || '0', 10)
    }));
  } catch (error) {
    const errorDetails = error.response ? JSON.stringify(error.response.data) : error.message;
    throw new Error(`Google Ads fetchAdGroupPerformance error: ${errorDetails}`);
  }
}

/**
 * Fetch PMax Asset Group Asset Performance (Query A for PMax)
 */
export async function fetchPmaxAssetPerformance(config, accessToken) {
  const customerId = config.customerId.replace(/-/g, '');
  const url = `https://googleads.googleapis.com/v24/customers/${customerId}/googleAds:searchStream`;

  const query = `
    SELECT
      asset_group_asset.asset_group,
      asset_group_asset.asset,
      asset_group_asset.field_type,
      asset_group_asset.performance_label,
      asset.text_asset.text,
      asset_group.id,
      asset_group.name,
      asset_group.final_urls,
      campaign.id,
      campaign.name
    FROM asset_group_asset
    WHERE asset_group_asset.field_type IN ('HEADLINE', 'LONG_HEADLINE', 'DESCRIPTION')
      AND asset.type = 'TEXT'
      AND campaign.advertising_channel_type = 'PERFORMANCE_MAX'
      AND campaign.status = 'ENABLED'
      AND asset_group.status = 'ENABLED'
  `.replace(/\s+/g, ' ').trim();

  try {
    const response = await axios.post(url, { query }, {
      headers: getHeaders(config, accessToken)
    });

    let results = [];
    if (Array.isArray(response.data)) {
      for (const chunk of response.data) {
        if (chunk.results && Array.isArray(chunk.results)) {
          results.push(...chunk.results);
        }
      }
    }

    return results.map(item => ({
      assetGroupResourceName: item.assetGroupAsset?.assetGroup,
      assetResourceName: item.assetGroupAsset?.asset,
      fieldType: item.assetGroupAsset?.fieldType,
      performanceLabel: item.assetGroupAsset?.performanceLabel || 'LEARNING',
      text: item.asset?.textAsset?.text || '',
      assetGroupId: item.assetGroup?.id,
      assetGroupName: item.assetGroup?.name,
      finalUrls: item.assetGroup?.finalUrls || [],
      campaignId: item.campaign?.id,
      campaignName: item.campaign?.name,
      campaignResourceName: `customers/${customerId}/campaigns/${item.campaign?.id}`
    }));
  } catch (error) {
    const errorDetails = error.response ? JSON.stringify(error.response.data) : error.message;
    throw new Error(`Google Ads fetchPmaxAssetPerformance error: ${errorDetails}`);
  }
}

/**
 * Fetch PMax Asset Group Level Performance (Query B for PMax)
 */
export async function fetchAssetGroupPerformance(config, accessToken) {
  const customerId = config.customerId.replace(/-/g, '');
  const url = `https://googleads.googleapis.com/v24/customers/${customerId}/googleAds:searchStream`;

  const query = `
    SELECT
      asset_group.id,
      asset_group.name,
      campaign.id,
      metrics.impressions,
      metrics.clicks,
      metrics.conversions,
      metrics.conversions_value,
      metrics.cost_micros
    FROM asset_group
    WHERE campaign.advertising_channel_type = 'PERFORMANCE_MAX'
      AND segments.date DURING LAST_90_DAYS
      AND asset_group.status = 'ENABLED'
  `.replace(/\s+/g, ' ').trim();

  try {
    const response = await axios.post(url, { query }, {
      headers: getHeaders(config, accessToken)
    });

    let results = [];
    if (Array.isArray(response.data)) {
      for (const chunk of response.data) {
        if (chunk.results && Array.isArray(chunk.results)) {
          results.push(...chunk.results);
        }
      }
    }

    return results.map(item => ({
      assetGroupId: item.assetGroup?.id,
      assetGroupName: item.assetGroup?.name,
      campaignId: item.campaign?.id,
      conversions: parseFloat(item.metrics?.conversions || '0'),
      conversionsValue: parseFloat(item.metrics?.conversionsValue || '0'),
      clicks: parseInt(item.metrics?.clicks || '0', 10),
      impressions: parseInt(item.metrics?.impressions || '0', 10),
      costMicros: parseInt(item.metrics?.costMicros || '0', 10)
    }));
  } catch (error) {
    const errorDetails = error.response ? JSON.stringify(error.response.data) : error.message;
    throw new Error(`Google Ads fetchAssetGroupPerformance error: ${errorDetails}`);
  }
}

/**
 * Fetch existing PMax Image Assets for cloning
 */
export async function fetchPmaxImageAssets(config, accessToken) {
  const customerId = config.customerId.replace(/-/g, '');
  const url = `https://googleads.googleapis.com/v24/customers/${customerId}/googleAds:searchStream`;

  const query = `
    SELECT
      asset_group_asset.asset_group,
      asset_group_asset.asset,
      asset_group_asset.field_type,
      asset.type
    FROM asset_group_asset
    WHERE asset_group_asset.field_type IN ('MARKETING_IMAGE', 'SQUARE_MARKETING_IMAGE')
      AND campaign.advertising_channel_type = 'PERFORMANCE_MAX'
      AND campaign.status = 'ENABLED'
      AND asset_group.status = 'ENABLED'
  `.replace(/\s+/g, ' ').trim();

  try {
    const response = await axios.post(url, { query }, {
      headers: getHeaders(config, accessToken)
    });

    let results = [];
    if (Array.isArray(response.data)) {
      for (const chunk of response.data) {
        if (chunk.results && Array.isArray(chunk.results)) {
          results.push(...chunk.results);
        }
      }
    }

    return results.map(item => ({
      assetGroupResourceName: item.assetGroupAsset?.assetGroup,
      assetResourceName: item.assetGroupAsset?.asset,
      fieldType: item.assetGroupAsset?.fieldType
    }));
  } catch (error) {
    const errorDetails = error.response ? JSON.stringify(error.response.data) : error.message;
    throw new Error(`Google Ads fetchPmaxImageAssets error: ${errorDetails}`);
  }
}

/**
 * Upload RSA Assets and create Responsive Search Ad
 */
export async function uploadRsaAssetsAndAd(config, accessToken, adGroupId, headlines, descriptions, finalUrls) {
  const customerId = config.customerId.replace(/-/g, '');
  const mutateUrl = `https://googleads.googleapis.com/v24/customers/${customerId}/googleAds:mutate`;

  // Step 1: Create Text Assets
  const assetOperations = [
    ...headlines.map(text => ({ assetOperation: { create: { textAsset: { text } } } })),
    ...descriptions.map(text => ({ assetOperation: { create: { textAsset: { text } } } }))
  ];

  try {
    const assetResponse = await axios.post(mutateUrl, { mutateOperations: assetOperations }, {
      headers: getHeaders(config, accessToken)
    });

    const resourceNames = assetResponse.data.mutateOperationResponses.map(r => r.assetResult?.resourceName);
    const headlineResourceNames = resourceNames.slice(0, headlines.length);
    const descriptionResourceNames = resourceNames.slice(headlines.length);

    // Step 2: Create Ad Group Ad
    const adGroupAdOperation = {
      adGroupAdOperation: {
        create: {
          adGroup: `customers/${customerId}/adGroups/${adGroupId}`,
          status: 'PAUSED',
          ad: {
            finalUrls: finalUrls,
            responsiveSearchAd: {
              headlines: headlineResourceNames.map(name => ({ asset: name })),
              descriptions: descriptionResourceNames.map(name => ({ asset: name }))
            }
          }
        }
      }
    };

    const adResponse = await axios.post(mutateUrl, { mutateOperations: [adGroupAdOperation] }, {
      headers: getHeaders(config, accessToken)
    });

    return {
      success: true,
      adGroupAdResourceName: adResponse.data.mutateOperationResponses[0]?.adGroupAdResult?.resourceName,
      createdAssets: resourceNames
    };

  } catch (error) {
    const errorDetails = error.response ? JSON.stringify(error.response.data) : error.message;
    throw new Error(`Google Ads uploadRsaAssetsAndAd error: ${errorDetails}`);
  }
}

/**
 * Upload PMax Assets and create Asset Group
 */
export async function uploadPmaxAssetsAndGroup(config, accessToken, campaignResourceName, targetAssetGroupId, newAssetGroupName, headlines, longHeadlines, descriptions, finalUrls, imageAssets) {
  const customerId = config.customerId.replace(/-/g, '');
  const mutateUrl = `https://googleads.googleapis.com/v24/customers/${customerId}/googleAds:mutate`;

  // Step 1: Create Text Assets
  const assetOperations = [
    ...headlines.map(text => ({ assetOperation: { create: { textAsset: { text } } } })),
    ...longHeadlines.map(text => ({ assetOperation: { create: { textAsset: { text } } } })),
    ...descriptions.map(text => ({ assetOperation: { create: { textAsset: { text } } } }))
  ];

  try {
    const assetResponse = await axios.post(mutateUrl, { mutateOperations: assetOperations }, {
      headers: getHeaders(config, accessToken)
    });

    const resourceNames = assetResponse.data.mutateOperationResponses.map(r => r.assetResult?.resourceName);
    
    let hIdx = 0;
    const headlineResourceNames = resourceNames.slice(hIdx, hIdx += headlines.length);
    const longHeadlineResourceNames = resourceNames.slice(hIdx, hIdx += longHeadlines.length);
    const descriptionResourceNames = resourceNames.slice(hIdx, hIdx += descriptions.length);

    // Step 2: Create Asset Group and link Assets (under temp ID -999)
    const assetGroupResourceName = `customers/${customerId}/assetGroups/-999`;

    const assetGroupOps = [
      {
        assetGroupOperation: {
          create: {
            resourceName: assetGroupResourceName,
            campaign: campaignResourceName,
            name: newAssetGroupName,
            finalUrls: finalUrls,
            status: 'PAUSED'
          }
        }
      },
      ...headlineResourceNames.map(resName => ({
        assetGroupAssetOperation: {
          create: {
            assetGroup: assetGroupResourceName,
            asset: resName,
            fieldType: 'HEADLINE'
          }
        }
      })),
      ...longHeadlineResourceNames.map(resName => ({
        assetGroupAssetOperation: {
          create: {
            assetGroup: assetGroupResourceName,
            asset: resName,
            fieldType: 'LONG_HEADLINE'
          }
        }
      })),
      ...descriptionResourceNames.map(resName => ({
        assetGroupAssetOperation: {
          create: {
            assetGroup: assetGroupResourceName,
            asset: resName,
            fieldType: 'DESCRIPTION'
          }
        }
      })),
      // Link the retrieved images
      ...imageAssets.map(img => ({
        assetGroupAssetOperation: {
          create: {
            assetGroup: assetGroupResourceName,
            asset: img.assetResourceName,
            fieldType: img.fieldType
          }
        }
      }))
    ];

    const groupResponse = await axios.post(mutateUrl, { mutateOperations: assetGroupOps }, {
      headers: getHeaders(config, accessToken)
    });

    return {
      success: true,
      assetGroupResourceName: groupResponse.data.mutateOperationResponses[0]?.assetGroupResult?.resourceName,
      createdAssets: resourceNames
    };

  } catch (error) {
    const errorDetails = error.response ? JSON.stringify(error.response.data) : error.message;
    throw new Error(`Google Ads uploadPmaxAssetsAndGroup error: ${errorDetails}`);
  }
}
