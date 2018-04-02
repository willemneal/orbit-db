const creatures = [
  '🐙', '🐷', '🐬', '🐞',
  '🐈', '🙉', '🐸', '🐓',
  '🐊', '🕷', '🐠', '🐘',
  '🐼', '🐰', '🐶', '🐥'
]
const outputHeaderElm = document.getElementById("output-header")
const outputElm = document.getElementById("output")
const statusElm = document.getElementById("status")
const dbnameField = document.getElementById("dbname")
const dbAddressField = document.getElementById("dbaddress")
const createButton = document.getElementById("create")
const openButton = document.getElementById("open")
const createType = document.getElementById("type")
const writerText = document.getElementById("writerText")
const publicCheckbox = document.getElementById("public")
const readonlyCheckbox = document.getElementById("readonly")
const textbox = document.getElementById("textbox")
const submitButton = document.getElementById("submit")
const EmailText = document.getElementById("email")
const createAccountButton = document.getElementById("createAccount")
const lookupAccountButton = document.getElementById("lookupAccount")

function handleError(e) {
  console.error(e.stack)
  statusElm.innerHTML = e.message
}

const hash = async (str) =>  {
  return crypto.subtle.digest({name: "SHA-512"}, asciiToUint8Array(str)).then(function (res){
         return bytesToHexString(res);
        })
}

const encryptText = async (plainText, password) => {
  const ptUtf8 = new TextEncoder().encode(plainText);

  const pwUtf8 = new TextEncoder().encode(password);
  const pwHash = await crypto.subtle.digest('SHA-256', pwUtf8); 

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const alg = { name: 'AES-GCM', iv: iv };
  const key = await crypto.subtle.importKey('raw', pwHash, alg, false, ['encrypt']);

  return { iv, encBuffer: await crypto.subtle.encrypt(alg, key, ptUtf8) };
}

const decryptText = async (ctBuffer, iv, password) => {
    const pwUtf8 = new TextEncoder().encode(password);
    const pwHash = await crypto.subtle.digest('SHA-256', pwUtf8);

    const alg = { name: 'AES-GCM', iv: iv };
    const key = await crypto.subtle.importKey('raw', pwHash, alg, false, ['decrypt']);

    const ptBuffer = await crypto.subtle.decrypt(alg, key, ctBuffer);

    const plaintext = new TextDecoder().decode(ptBuffer);

    return plaintext;
}

const encryptKeystore = async (db) => {
  const toEncrypt = {keystore:db.keystore, id :db.id}

}

const main = (IPFS, ORBITDB) => {
  let orbitdb, db, accountDB
  let count = 0
  let interval = Math.floor((Math.random() * 6000) + (Math.random() * 2000))
  let updateInterval
  let dbType, dbAddress
  let accountDBName

  // If we're building with Webpack, use the injected IPFS module.
  // Otherwise use 'Ipfs' which is exposed by ipfs.min.js
  if (IPFS)
    Ipfs = IPFS

  // If we're building with Webpack, use the injected OrbitDB module.
  // Otherwise use 'OrbitDB' which is exposed by orbitdb.min.js
  if (ORBITDB)
    OrbitDB = ORBITDB

  // Init UI
  openButton.disabled = true
  createButton.disabled = true
  statusElm.innerHTML = "Starting IPFS..."

  // Create IPFS instance
  const ipfs = new Ipfs({
    repo: '/orbitdb/examples/browser/new/ipfs/0.27.3',
    start: true,
    EXPERIMENTAL: {
      pubsub: true,
    },
    config: {
      Addresses: {
        Swarm: [
          // Use IPFS dev signal server
          // '/dns4/star-signal.cloud.ipfs.team/wss/p2p-webrtc-star',
          '/dns4/ws-star.discovery.libp2p.io/tcp/443/wss/p2p-websocket-star',
          // Use local signal server
          // '/ip4/0.0.0.0/tcp/9090/wss/p2p-webrtc-star',
        ]
      },
    }
  })

  ipfs.on('error', (e) => handleError(e))
  ipfs.on('ready', () => {
    openButton.disabled = false
    createButton.disabled = false
    statusElm.innerHTML = "IPFS Started"
    console.log(ipfs._peerInfo.id._idB58String)
    orbitdb = new OrbitDB(ipfs)
    console.log("public " + orbitdb.key.getPublic('hex') + "\nprivate "+orbitdb.key.getPrivate('hex'))
  })

  const load = async (db, statusText) => {
    // Set the status text
    statusElm.innerHTML = statusText

    // When the database is ready (ie. loaded), display results
    db.events.on('ready', () => queryAndRender(db))
    // When database gets replicated with a peer, display results
    db.events.on('replicated', () => {
      queryAndRender(db)
    })
    // When we update the database, display result
    db.events.on('write', () => queryAndRender(db))

    db.events.on('replicate.progress', () => queryAndRender(db))

    // Hook up to the load progress event and render the progress
    let maxTotal = 0, loaded = 0
    db.events.on('load.progress', (address, hash, entry, progress, total) => {
      loaded ++
      maxTotal = Math.max.apply(null, [progress, maxTotal, progress, 0])
      total = Math.max.apply(null, [progress, maxTotal, total, 0])
      statusElm.innerHTML = `Loading database... ${maxTotal} / ${total}`
    })

    db.events.on('ready', () => {
      // Set the status text
      setTimeout(() => {
        statusElm.innerHTML = 'Database is ready'
        submitButton.disabled = false}, 1000)
    })

    // Load locally persisted database
    await db.load()
  }
  // const startWriter = async (db, interval) => {
  //   // Set the status text
  //   writerText.innerHTML = `Writing to database every ${interval} milliseconds...`
  //
  //   // Start update/insert loop
  //   updateInterval = setInterval(async () => {
  //     try {
  //       await update(db)
  //     } catch (e) {
  //       console.error(e.toString())
  //       if (e.toString() === 'Error: Not allowed to write') {
  //         writerText.innerHTML = '<span style="color: red">' + e.toString() + '</span>'
  //         clearInterval(updateInterval)
  //       }
  //     }
  //   }, interval)
  // }

  const resetDatabase = async (db) => {
    writerText.innerHTML = ""
    outputElm.innerHTML = ""
    outputHeaderElm.innerHTML = ""

    clearInterval(updateInterval)

    if (db) {
      await db.close()
    }

    interval = Math.floor((Math.random() * 300) + (Math.random() * 2000))
  }

  const createDatabase = async () => {
    await resetDatabase(db)

    openButton.disabled = true
    createButton.disabled = true

    try {
      const name = dbnameField.value
      const type = createType.value
      const publicAccess = publicCheckbox.checked

      db = await orbitdb.open(name, {
        // If database doesn't exist, create it
        create: true,
        overwrite: true,
        // Load only the local version of the database,
        // don't load the latest from the network yet
        localOnly: false,
        type: type,
        // If "Public" flag is set, allow anyone to write to the database,
        // otherwise only the creator of the database can write
        write: publicAccess ? ['*'] : [],
      })

      await load(db, 'Creating database...')
      // startWriter(db, interval)
      //update(db)
    } catch (e) {
      console.error(e)
    }
    openButton.disabled = false
    createButton.disabled = false
  }

  const openDatabase = async () => {
    const address = dbAddressField.value

    await resetDatabase(db)

    openButton.disabled = true
    createButton.disabled = true

    try {
      statusElm.innerHTML = "Connecting to peers..."
      db = await orbitdb.open(address, { sync: true })
      await load(db, 'Loading database...')

      if (!readonlyCheckbox.checked) {
        //db.add({msg:"ping"})
      } else {
        writerText.innerHTML = `Listening for updates to the database...`
      }
    } catch (e) {
      console.error(e)
    }
    openButton.disabled = false
    createButton.disabled = false
  }

  const update = async (db) => {
    count ++

    const time = new Date().toISOString()
    const idx = Math.floor(Math.random() * creatures.length)
    const creature = creatures[idx]

    if (db.type === 'eventlog') {
      await db.add({msg:"ping"})
    } else if (db.type === 'feed') {
      const value = "GrEEtinGs from " + orbitdb.id + " " + creature + ": Hello #" + count + " (" + time + ")"
	      await db.add(value)
    } else if (db.type === 'docstore') {
	    const value = { _id: 'peer1', avatar: creature, updated: time }
      await db.put(value)
    } else if (db.type === 'keyvalue') {
      await db.set('mykey', creature)
    } else if (db.type === 'counter') {
      await db.inc(1)
    } else {
      throw new Error("Unknown datatbase type: ", db.type)
    }
  }

  const query = (db) => {
    if (db.type === 'eventlog')
      return db.iterator({limit:-1}).collect().map(e => e.payload.value)
    else if (db.type === 'feed')
      return db.iterator({ limit: 5 }).collect()
    else if (db.type === 'docstore')
      return db.get('peer1')
    else if (db.type === 'keyvalue')
      return db.get('mykey')
    else if (db.type === 'counter')
      return db.value
    else
      throw new Error("Unknown datatbase type: ", db.type)
  }

  const queryAndRender = async (db) => {
    const networkPeers = await ipfs.swarm.peers()
    const databasePeers = await ipfs.pubsub.peers(db.address.toString())

    const result = query(db)

    if (dbType !== db.type || dbAddress !== db.address) {
      dbType = db.type;
      dbAddress = db.address;

      outputHeaderElm.innerHTML = `
        <h2>${dbType.toUpperCase()}</h2>
        <h3 id="remoteAddress">${dbAddress}</h3>
        <p>Copy this address and use the 'Open Remote Database' in another browser to replicate this database between peers.</p>
      `
    }

    outputElm.innerHTML = `
      <div><b>Peer ID:</b> ${orbitdb.id}</div>
      <div><b>Peers (database/network):</b> ${databasePeers.length} / ${networkPeers.length}</div>
      <div><b>Oplog Size:</b> ${db._replicationInfo.progress} / ${db._replicationInfo.max}</div>
      <h2>Results</h2>
      <div id="results">
        <div>
        ${result.reverse().join('<br>\n')}
        </div>
      </div>
    `
  }
  const submitText = async () => {
     await db.add(textbox.value)
  }

  const createAccountDB = async () => {
        accountDBName = await hash("accountDB")
       accountDB = await orbitdb.open(accountDBName, {
         // If database doesn't exist, create it
         create: true,
         overwrite: true,
         // Load only the local version of the database,
         // don't load the latest from the network yet
         localOnly: false,
         type: 'keyvalue',
         // If "Public" flag is set, allow anyone to write to the database,
         // otherwise only the creator of the database can write
         write: ['*'],
        })
        await accountDB.load()
  }
  

  
  const lookupAccount = async () => {
     var emailText = EmailText.value
     console.log("looking up Account with email "+ emailText)
     
     if (!accountDB){
        await createAccountDB()
      }
      console.log(accountDB.address)
      const docs = accountDB.get(await hash(emailText))
      if (!docs){
        console.log("account doesn't exist")
        return
      }
      console.log(docs)
      

  }

  const createAccount = async () => {
     var emailText = EmailText.value
     console.log("creating account for "+emailText)
     if (!accountDB){
       await createAccountDB() 
     }
      if (!accountDB.get(emailText)){
        var hashedValue = await hash(emailText)
        accountDB.put(hashedValue, emailText +" hashes to " + hashedValue)
      }
      console.log(accountDB.get(emailText))


  }

  createAccountButton.addEventListener('click', createAccount)
  lookupAccountButton.addEventListener('click', lookupAccount)
  submitButton.addEventListener('click', submitText)
  openButton.addEventListener('click', openDatabase)
  createButton.addEventListener('click', createDatabase)
}

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined')
  module.exports = main
