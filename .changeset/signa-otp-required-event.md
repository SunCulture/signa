---
"@signajs/react-native": minor
"@signajs/react": minor
---

Add an `onOtpRequired` callback. Signa sends the `otp_required` event (`signa:otp_required` in React Native) when the signer must enter the invitation code they were sent before the form opens. Hosts that hide the frame until `onLoad` fires should show it on this event too, or the signer never sees the code screen.
