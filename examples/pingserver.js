'use strict'
const IPFS = require('ipfs')
const OrbitDB = require('../src/OrbitDB')
function sleep (time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

// Create the first peer
const ipfs1 = new IPFS({ repo: './ipfs1' ,start: true,
EXPERIMENTAL: {
  pubsub: true,
},
Addresses: {
          Swarm: [
            "/ip4/0.0.0.0/tcp/4000"
          ],
          API: "/ip4/127.0.0.1/tcp/5005",
          Gateway: "/ip4/127.0.0.1/tcp/9999"
          }
  })
ipfs1.on('ready', async () => {
  // Create the database
  const orbitdb1 = new OrbitDB(ipfs1, './orbitdb1')
  const db1 = await orbitdb1.log('pingpong',{write:['*']})
  console.log("done with first database "+ db1.address.toString())

  // Create the second peer
    db1.events.on('replicated',async ()=> {
      const result = db1.iterator({ limit: -1 }).collect().map(e => e.payload.value.msg)
      console.log(result[result.length-1])
      sleep(2000 * Math.random()).then(()=>
      db1.add({msg:"pong"}))
    })

  //   // Start adding entries to the first database
  //   setInterval(async () => {
  //     await db1.add({ time: new Date().getTime() })
  //   }, 4000)
})
