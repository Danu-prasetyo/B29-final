const express = require("express");
const bcrypt = require("bcrypt");
const flash = require("express-flash");
const session = require("express-session");

const db = require("./connection/db");
const upload = require("./middlewares/uploaddata");

const app = express();
const PORT = 5005;

let isLogin = true;

//array
let blogs = [
  {
    id: 1,
    title: "Pasar Coding di Indonesia di Nilai Masih Menjanjikan",
    post_at: "12 jul 2021 22:30 WIB",
    author: "Danu Prasetyo",
    content:
      "Ketimpangan sumber daya manusia (SDM) di sektor digital masih menjadi isu yang belum terpecahkan. Berdasarkan penelitian ManpowerGroup, ketimpangan SDM global, termasuk Indonesia, meningkat dua kali lipat dalam satu dekade terakhir. Lorem ipsum, dolor sit amet consectetur adipisicing elit. Quam, molestiae numquam! Deleniti maiores expedita eaque deserunt quaerat! Dicta, eligendi debitis?",
  },
];

app.set("view engine", "hbs"); //set template engine

app.use(flash());

app.use(
  session({
    cookie: {
      maxAge: 2 * 60 * 60 * 1000,
      secure: false,
      httpOny: true,
    },
    store: new session.MemoryStore(),
    saveUninitialized: true,
    resave: false,
    secret: "secretValue",
  })
);

app.use("/public", express.static(__dirname + "/public"));
app.use("/uploads", express.static(__dirname + "/uploads")); //set public folder/path

// Untuk menerima data objek berupa string atau array
app.use(express.urlencoded({ extended: false }));

app.get("/", function (request, response) {
  db.connect(function (err, client, done) {
    if (err) throw err;

    client.query("SELECT * FROM project", function (err, result) {
      if (err) throw err;
      let data = result.rows;
      // console.log(data)

      response.render("index", { table: data });
    });
  });
  //response.render("index");
});

app.get("/blog", function (req, res) {
  //route for blog data

  let query = `SELECT blog.id, blog.title, blog.content, blog.image, tb_user.name AS author, blog.post_at  FROM tb_user LEFT JOIN blog 
  ON tb_user.id = blog.authorid`;

  db.connect(function (err, client, done) {
    //koneksi ek databse
    if (err) throw err; //untuk emnampilkan error jika ada

    client.query(query, function (err, result) {
      done();
      let data = result.rows;
      console.log(data);
      //let post_test = new Date();
      data = data.map(function (blog) {
        return {
          ...blog,
          post_at: getFullTime(blog.post_at),
          post_age: getDistanceTime(blog.post_at),
          isLogin: req.session.isLogin,
          image: "/uploads/" + blog.image,
        };
      });

      res.render("blog", {
        isLogin: req.session.isLogin,
        blogs: data,
        user: req.session.user,
      });
    });
  });
});

//mengambil data dari hasil inputan
app.post("/blog", upload.single("image"), function (req, res) {
  let data = req.body;

  if (!req.session.user) {
    req.flash("danger", "Please Login");
    return res.redirect("/add-blog");
  }

  if (!req.session.user) {
    req.flash("danger", "Please Login");
    return res.redirect("/add-blog");
  }

  let authorid = req.session.user.id;

  let image = req.file.filename;

  db.connect(function (err, client, done) {
    //koneksi ek databse
    if (err) throw err; //untuk emnampilkan error jika ada

    client.query(`INSERT INTO blog(title,content,image,authorid) VALUES ('${data.title}', '${data.content}', '${image}', '${authorid}')`, function (err, result) {
      if (err) throw err;

      //mengarahkan ke halaman blog
      res.redirect("/blog");
    });
  });
});

app.get("/add-blog", function (req, res) {
  res.render("add-blog", {
    isLogin: req.session.isLogin,
    user: req.session.user,
  });
});

app.get("/delete-blog/:id", function (req, res) {
  //let index = req.params.index;
  let id = req.params.id;
  //blogs.splice(index, 1);

  let query = `DELETE FROM blog WHERE id = ${id}`;

  //console.log(query);
  db.connect(function (err, client, done) {
    if (err) throw err;

    client.query(query, function (err, result) {
      done();
      if (err) throw err;

      res.redirect("/blog");
    });
  });
});

//masih undifined
app.get("/edit-blog/:id", function (req, res) {
  let id = req.params.id;

  let query = `SELECT * FROM blog WHERE id = ${id}`;

  db.connect(function (err, client, done) {
    if (err) throw err;

    client.query(query, function (err, result) {
      if (err) throw err;
      let data = result.rows[0];
      res.render("edit-blog", {
        blog: data,
        id: id,
        isLogin: req.session.isLogin,
        user: req.session.user,
      });
    });
  }); // render file edit-blog
});
app.post("/update-blog/:id", upload.single("image"), function (req, res) {
  let id = req.params.id;
  let data = req.body;

  let image = req.file.filename;

  let query = `UPDATE blog SET title='${data.title}', content='${data.content}',image='${image}' WHERE id=${id}`;

  db.connect(function (err, client, done) {
    if (err) throw err;

    client.query(query, function (err) {
      if (err) throw err;
      res.redirect("/blog");
    });
  });
});

app.get("/contact", function (req, res) {
  res.render("contact");
});

app.get("/blog-detail/:id", function (req, res) {
  let id = req.params.id;

  db.connect(function (err, client, done) {
    if (err) throw err;

    client.query(
      `SELECT blog.id, blog.title, blog.content, blog.image, tb_user.name AS author, blog.post_at  FROM blog  LEFT JOIN tb_user
    ON tb_user.id = blog.authorid WHERE blog.id = ${id}`,
      function (err, result) {
        done();
        if (err) throw err;
        let data = result.rows[0];
        data = {
          title: data.title,
          post_at: getFullTime(data.post_at),
          author: data.author,
          post_age: getDistanceTime(data.post_at),
          content: data.content,
          image: "/uploads/" + data.image,
        };
        //console.log(data);
        res.render("blog-detail", { id: id, blog: data });
      }
    );
  });
});

app.get("/register", function (req, res) {
  res.render("register");
});

app.post("/register", function (req, res) {
  const { name, email, password } = req.body;

  const hashedPassword = bcrypt.hashSync(password, 10);

  let query = `INSERT INTO tb_user(name, email, password) VALUES ('${name}', '${email}', '${hashedPassword}')`;
  db.connect(function (err, client, done) {
    if (err) throw err;

    client.query(query, function (err, result) {
      if (err) throw err;
      res.redirect("login");
    });
  });
});

app.get("/login", function (req, res) {
  res.render("login");
});

app.post("/login", function (req, res) {
  const { email, password } = req.body;

  let query = `SELECT * FROM tb_user WHERE email = '${email}'`;
  db.connect(function (err, client, done) {
    if (err) throw err;

    client.query(query, function (err, result) {
      if (err) throw err;

      if (result.rows.length == 0) {
        req.flash("danger", "Invalid Email or password");
        return res.redirect("/login");
      }

      let isMatch = bcrypt.compareSync(password, result.rows[0].password);
      //console.log(isMatch);
      if (isMatch) {
        req.session.isLogin = true;
        req.session.user = {
          id: result.rows[0].id,
          name: result.rows[0].name,
          email: result.rows[0].email,
        };
        req.flash("success", "Login Success");
        res.redirect("/blog");
      } else {
        req.flash("danger", "Invalid Email or password");
        res.redirect("/login");
      }
    });
  });
});

app.get("/logout", function (req, res) {
  req.session.destroy();
  res.redirect("/blog");
});

app.listen(PORT, function () {
  console.log(`Server starting on PORT: ${PORT}`);
});

//function custom
//menampilkan kapan waktu data tersebut di upload/postegerg

let month = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function getFullTime(time) {
  let date = time.getDate(); //tanggal = getDate()
  let monthIndex = time.getMonth(); //bulan = getMonth()
  let year = time.getFullYear(); //tahun = getFullYear()
  let hours = time.getHours(); //jam = getHours()
  let minutes = time.getMinutes(); //menit = getMinutes()
  let seconds = time.getSeconds(); //detik = getSeconds()

  let fullTime = `${date} ${month[monthIndex]} ${year} ${hours}:${minutes}:${seconds} WIB`;
  return fullTime;
}
//menampilkan berapa lama post tersebut sudah diupload
function getDistanceTime(time) {
  let timePost = time;
  let timeNow = new Date();

  let distance = timeNow - timePost;

  //convert waktu
  let milliseconds = 1000; //milliseconds in 1 seconds
  let secondsInHours = 3600; //Second in 1 hours
  let hoursInDay = 23; //hours in 1 day

  let distanceDay = Math.floor(distance / (milliseconds * secondsInHours * hoursInDay));

  //method membulatkan nilai koma
  //distanceDay = Math.floor(distanceDay);

  //pengecekan jika jarak lebih dari sama dengan 1(sehari)
  if (distanceDay >= 1) {
    return `${distanceDay} days ago`;
  } else {
    //convert milliseconds to hours (jika kurang dari 1 hari)
    let distanceHours = Math.floor(distance / (1000 * 60 * 60));
    if (distanceHours >= 1) {
      return `${distanceHours} hours ago`;
    } else {
      //convert to minute (jika kurang dari 1 jam)
      let distanceMinutes = Math.floor(distance / (1000 * 60));
      if (distanceMinutes >= 1) {
        return ` ${distanceMinutes} minutes ago`;
      } else {
        //convert to second (jika kurang dari 1 menit)
        let distanceSeconds = Math.floor(distance / 1000);
        console.log(distanceSeconds);
        return `${distanceSeconds} seconds ago`;
      }
    }
  }
}

//ketika database dari postgree dihapus muncul error
