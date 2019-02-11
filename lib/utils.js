const sdpInactiveTemplate = `v=0
o=- 3758821387 3758821387 IN IP4 X.X.X.X
s=drachtio dummy
t=0 0
m=audio 4000 RTP/AVP 0 8 96 101 98 97 99
c=IN IP4 X.X.X.X
a=inactive
a=rtpmap:101 opus/48000/2
a=rtpmap:98 speex/16000
a=rtpmap:97 speex/8000
a=rtpmap:99 speex/32000
a=rtpmap:0 PCMU/8000
a=rtpmap:8 PCMA/8000
a=rtpmap:96 telephone-event/8000
a=fmtp:96 0-16`;

function makeInactiveSdp(address) {
  const arr = /^([^:]+):?\d+?$/.exec(address);
  return sdpInactiveTemplate.replace(/X.X.X.X/g, arr[1]);
}

module.exports = {
  makeInactiveSdp
};
