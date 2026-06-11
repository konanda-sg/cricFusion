// Port of send_otp.php — register device + send OTP to mobile number
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', '*')
  if (req.method === 'OPTIONS') return res.status(204).end()

  const { mobile } = req.body || {}
  if (!mobile || !/^[6-9]\d{9}$/.test(mobile)) {
    return res.status(400).json({ error: 'Invalid mobile number' })
  }
//
  try {
    // Step 1: Register anonymous guest device
    const deviceId = String(Math.floor(Math.random() * 900 + 100)) + String(Date.now()) + String(Math.floor(Math.random() * 90 + 10))
    const guestResp = await fetch('https://tb.tapi.videoready.tv/binge-mobile-services/pub/api/v1/user/guest/register', {
      method: 'POST',
      headers: {
        'accept': 'application/json, text/plain, */*',
        'authorization': 'bearer undefined',
        'referer': 'https://www.tataplaybinge.com/',
        'deviceid': deviceId,
        'origin': 'https://www.tataplaybinge.com',
        'user-agent': UA,
      },
    })
    const guestData = await guestResp.json()
    const anonymousId = guestData.data?.anonymousId
    if (!anonymousId) return res.status(500).json({ error: 'Device registration failed' })

    // Step 2: Send OTP
    const otpResp = await fetch('https://tb.tapi.videoready.tv/binge-mobile-services/pub/api/v1/user/authentication/generateOTP', {
      method: 'POST',
      headers: {
        'accept': 'application/json, text/plain, */*',
        'anonymousid': anonymousId,
        'deviceid': deviceId,
        'mobilenumber': mobile,
        'newotpflow': '4DOTP',
        'origin': 'https://www.tataplaybinge.com',
        'platform': 'BINGE_ANYWHERE',
        'referer': 'https://www.tataplaybinge.com/',
        'user-agent': UA,
      },
    })
    const otpData = await otpResp.json()

    return res.status(200).json({
      message: otpData.message || 'OTP sent',
      deviceId,
      anonymousId,
    })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
