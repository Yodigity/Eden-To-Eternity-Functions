const { db } = require("../util/admin");

exports.getAllTalks = (req, res) => {
  db.collection("talks")
    .orderBy("createdAt", "desc")
    .get()
    .then((data) => {
      let talks = [];
      data.forEach((doc) => {
        talks.push({
          talkId: doc.id,
          body: doc.data().body,
          userHandle: doc.data().userHandle,
          createdAt: doc.data().createdAt,
          commentCount: doc.data().commentCount,
          likeCount: doc.data().likeCount,
          userImage: doc.data().userImage,
        });
      });
      return res.json(talks);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};

exports.postOneTalk = (req, res) => {
  if (req.body.body.trim() === "") {
    return res.status(400).json({ body: "Body must not be empty" });
  }

  const newTalk = {
    body: req.body.body,
    userHandle: req.user.handle,
    userImage: req.user.imageUrl,
    createdAt: new Date().toISOString(),
    likeCount: 0,
    commentCount: 0,
  };

  db.collection("talks")
    .add(newTalk)
    .then((doc) => {
      const resTalk = newTalk;
      resTalk.talkId = doc.id;
      res.json(resTalk);
    })
    .catch((err) => {
      res.status(500).json({ error: "something went wrong" });
      console.error(err);
    });
};
// Fetch one talk
exports.getTalk = (req, res) => {
  let talkData = {};
  db.doc(`/talks/${req.params.talkId}`)
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: "Talk not found" });
      }
      talkata = doc.data();
      talkData.talkId = doc.id;
      return db
        .collection("comments")
        .orderBy("createdAt", "desc")
        .where("talkId", "==", req.params.talkId)
        .get();
    })
    .then((data) => {
      talkData.comments = [];
      data.forEach((doc) => {
        talkData.comments.push(doc.data());
      });
      return res.json(talkData);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};
// Comment on a comment
exports.commentOnTalk = (req, res) => {
  if (req.body.body.trim() === "")
    return res.status(400).json({ comment: "Must not be empty" });

  const newComment = {
    body: req.body.body,
    createdAt: new Date().toISOString(),
    talkId: req.params.talkId,
    userHandle: req.user.handle,
    userImage: req.user.imageUrl,
  };
  console.log(newComment);

  db.doc(`/talks/${req.params.talkId}`)
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: "Talk not found" });
      }
      return doc.ref.update({ commentCount: doc.data().commentCount + 1 });
    })
    .then(() => {
      return db.collection("comments").add(newComment);
    })
    .then(() => {
      res.json(newComment);
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({ error: "Something went wrong" });
    });
};
// Like a talk
exports.likeTalk = (req, res) => {
  const likeDocument = db
    .collection("likes")
    .where("userHandle", "==", req.user.handle)
    .where("talkId", "==", req.params.talkId)
    .limit(1);

  const talkDocument = db.doc(`/talks/${req.params.talkId}`);

  let talkData;

  talkDocument
    .get()
    .then((doc) => {
      if (doc.exists) {
        talkData = doc.data();
        talkData.talkId = doc.id;
        return likeDocument.get();
      } else {
        return res.status(404).json({ error: "Talk not found" });
      }
    })
    .then((data) => {
      if (data.empty) {
        return db
          .collection("likes")
          .add({
            talkId: req.params.talkId,
            userHandle: req.user.handle,
          })
          .then(() => {
            talkData.likeCount++;
            return talkDocument.update({ likeCount: talkData.likeCount });
          })
          .then(() => {
            return res.json(talkData);
          });
      } else {
        return res.status(400).json({ error: "Talk already liked" });
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};

exports.unlikeTalk = (req, res) => {
  const likeDocument = db
    .collection("likes")
    .where("userHandle", "==", req.user.handle)
    .where("talkId", "==", req.params.talkId)
    .limit(1);

  const talkDocument = db.doc(`/talks/${req.params.talkId}`);

  let talkData;

  talkDocument
    .get()
    .then((doc) => {
      if (doc.exists) {
        talkData = doc.data();
        talkData.talkId = doc.id;
        return likeDocument.get();
      } else {
        return res.status(404).json({ error: "Talk not found" });
      }
    })
    .then((data) => {
      if (data.empty) {
        return res.status(400).json({ error: "Talk not liked" });
      } else {
        return db
          .doc(`/likes/${data.docs[0].id}`)
          .delete()
          .then(() => {
            talkData.likeCount--;
            return talkDocument.update({ likeCount: talkData.likeCount });
          })
          .then(() => {
            res.json(talkData);
          });
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};
// Delete a talk
exports.deleteTalk = (req, res) => {
  const document = db.doc(`/talks/${req.params.talkId}`);
  document
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: "Talk not found" });
      }
      if (doc.data().userHandle !== req.user.handle) {
        return res.status(403).json({ error: "Unauthorized" });
      } else {
        return document.delete();
      }
    })
    .then(() => {
      res.json({ message: "Talk deleted successfully" });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};
