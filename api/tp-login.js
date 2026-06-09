// Port of verify_otp.php — validate OTP, get subscriber credentials
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36'
const BASE = 'https://www.tataplaybinge.com'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', '*')
  if (req.method === 'OPTIONS') return res.status(204).end()

  const { mobile, otp, deviceId, anonymousId } = req.body || {}
  if (!mobile || !otp || !deviceId || !anonymousId) {
    return res.status(400).json({ error: 'Missing fields' })
  }

  try {
    // Step 1: Validate OTP
    const validateResp = await fetch('https://tb.tapi.videoready.tv/binge-mobile-services/pub/api/v1/user/authentication/validateOTP', {
      method: 'POST',
      headers: {
        'accept': 'application/json, text/plain, */*',
        'anonymousid': anonymousId,
        'content-type': 'application/json',
        'deviceid': deviceId,
        'origin': BASE,
        'platform': 'BINGE_ANYWHERE',
        'referer': BASE + '/',
        'user-agent': UA,
      },
      body: JSON.stringify({ mobileNumber: mobile, otp }),
    })
    const validateData = await validateResp.json()
    if (!validateData.data?.userAuthenticateToken) {
      return res.status(401).json({ error: validateData.message || 'OTP validation failed' })
    }
    const token = validateData.data.userAuthenticateToken
    const devicetoken = validateData.data.deviceAuthenticateToken

    // Step 2: Get subscriber / account details
    const subResp = await fetch('https://tb.tapi.videoready.tv/binge-mobile-services/api/v4/subscriber/details', {
      headers: {
        'accept': 'application/json, text/plain, */*',
        'anonymousid': anonymousId,
        'authorization': `bearer ${token}`,
        'devicetype': 'WEB',
        'mobilenumber': mobile,
        'origin': BASE,
        'platform': 'BINGE_ANYWHERE',
        'referer': BASE + '/',
        'user-agent': UA,
      },
    })
    const subData = await subResp.json()
    const acct = subData.data?.accountDetails?.[0] || {}
    const dthStatus = acct.dthStatus || ''

    // Step 3: Create or update user session (mirrors the PHP DTH branch logic)
    let loginUrl, loginBody
    if (!dthStatus) {
      loginUrl = 'https://tb.tapi.videoready.tv/binge-mobile-services/api/v3/create/new/user'
      loginBody = { dthStatus: 'Non DTH User', subscriberId: mobile, login: 'OTP', mobileNumber: mobile, isPastBingeUser: false, eulaChecked: true, packageId: '' }
    } else if (dthStatus === 'DTH Without Binge') {
      loginUrl = 'https://tb.tapi.videoready.tv/binge-mobile-services/api/v3/create/new/user'
      loginBody = { dthStatus, subscriberId: acct.subscriberId || '', login: 'OTP', mobileNumber: mobile, baId: null, isPastBingeUser: false, eulaChecked: true, packageId: '', referenceId: null }
    } else {
      loginUrl = 'https://tb.tapi.videoready.tv/binge-mobile-services/api/v3/update/exist/user'
      loginBody = { dthStatus, subscriberId: acct.subscriberId || '', bingeSubscriberId: acct.bingeSubscriberId || '', baId: acct.baId || '', login: 'OTP', mobileNumber: mobile, payment_return_url: BASE + '/subscription-transaction/status', eulaChecked: true, packageId: '' }
    }

    const loginResp = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        'accept': 'application/json, text/plain, */*',
        'anonymousid': anonymousId,
        'authorization': `bearer ${token}`,
        'content-type': 'application/json',
        'device': 'WEB',
        'deviceid': deviceId,
        'devicename': 'Web',
        'devicetoken': devicetoken,
        'origin': BASE,
        'platform': 'WEB',
        'referer': BASE + '/',
        'user-agent': UA,
      },
      body: JSON.stringify(loginBody),
    })
    const loginData = await loginResp.json()
    console.log('[tp-login] step3 data keys:', JSON.stringify(Object.keys(loginData?.data || {})))
    console.log('[tp-login] step3 data:', JSON.stringify(loginData?.data))

    const subscriberId = loginData.data?.subscriberId || loginBody.subscriberId
    const userAuthenticateToken = loginData.data?.userAuthenticateToken || token

    return res.status(200).json({
      message: loginData.message || 'Logged in successfully',
      subscriberId,
      userAuthenticateToken,
      // Return any JWT-like fields (contains dots = JWT format) so the client can store them
      _loginData: loginData.data,
    })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
