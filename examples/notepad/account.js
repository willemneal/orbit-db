class Server {
    constructor(peerID){


}



}



class Account {
    constructor(ipfs,orbitdb){
        this.orbitdb = orbitdb
        this.ipfs = ipfs
    }
    createAccountDB(orbitdb) {
      (async () => {
      var accountDBName = "/orbitdb/QmWfN1JwLknbVfCZ3tZ6aZC9PHbbK2cX7RtZnzukKgUfMX/Accounts!"
      var accountDB = await orbitdb.open(accountDBName, { sync: true })
      await accountDB.load()
      this.db = accountDB
      console.log("accountDB loaded "+ accountDB.address.toString())
    })()


    }
    createAccount() {

    }
    lookupAccount() {

    }

    get key() {
      return this.orbitdb.key
    }

    get keystore(){
      return this.orbitdb.keystore
    }

    get id() {
      return this.orbitdb.id
    }

    get publicKey() {
      return this.key.getPublic("hex")
    }

    sign(data) {
      return this.keystore.sign(this.key, data)
    }

    verify(signature, key, data){
      return this.keystore.verify(signature, key, data)

    }
}

class Message {
   constructor(body, key){
     this.msg.body = body
   }

}


class Petition {
   constructor(account, name, desc){
      this.account = account
      this.name = name;
      (async () => {
      this.db = await account.orbitdb.eventlog(name, {write:[]})
      this.hash = await this.db.add({msg:desc})
      this.publicDB = await account.orbitdb.keyvalue(name, {write:["*"]})
      }
    ) ()
   }

   get desc(){
     return this.db.all[0].msg
   }

   sign(account) {
     var signature = account.sign(this.desc)
     var publicKey = account.publicKey
     this.publicDB.put(publicKey, signature)

   }

}
