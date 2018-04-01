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
  const db1 = await orbitdb1.log('events',{write:['*']})
  console.log("done with first database "+ db1.address.toString())

  // Create the second peer
  const ipfs2 = new IPFS({ repo: './ipfs2' ,
                          start: true,
                          EXPERIMENTAL: {
                            pubsub: true,
                          },
                      Addresses: {
                                Swarm: [
                                  "/ip4/0.0.0.0/tcp/4040"
                                ],
                                API: "/ip4/127.0.0.1/tcp/5002",
                                Gateway: "/ip4/127.0.0.1/tcp/9090"
                                }
                        })
  console.log("about to start second database")

  ipfs2.on('ready', async () => {
    // Open the first database for the second peer,
    // ie. replicate the database
    const orbitdb2 = new OrbitDB(ipfs2, './orbitdb2')
    console.log("creating second database")

    const db2 = await orbitdb2.log(db1.address.toString())
    console.log("done with second database")


    // When the second database replicated new heads, query the database
    db2.events.on('replicated', () => {
      const result = db2.iterator({ limit: -1 }).collect().map(e => e.payload.value.msg)
      console.log(result[result.length-1])
      sleep(1000 * Math.random()).then(()=>
      db2.add({msg:"pong"}))
    })

    db1.events.on('replicated',async ()=> {
      const result = db1.iterator({ limit: -1 }).collect().map(e => e.payload.value.msg)
      console.log(result[result.length-1])
      sleep(1000 * Math.random()).then(()=>
      db1.add({msg:"ping"}))
    })
    db1.add({msg:"ping"})

  //   // Start adding entries to the first database
  //   setInterval(async () => {
  //     await db1.add({ time: new Date().getTime() })
  //   }, 4000)
   })
})
