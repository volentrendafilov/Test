const UserModel = firebase.auth();
const DB = firebase.firestore();

const app = Sammy('#root', function () {

    this.use('Handlebars', 'hbs');

    // Home routes
    this.get('/home', function (context) {
        DB.collection('offers')
            .get()
            .then(res => {
                context.offers = res.docs.map(offer => { return { id: offer.id, ...offer.data() } });
                extendContext(context)
                    .then(function () {
                        this.partial('./templates/home.hbs');
                    })
            })
            .catch(err => console.log(err))
    });

    // User routes
    this.get('/register', function (context) {
        extendContext(context)
            .then(function () {
                this.partial('./templates/register.hbs');
            });
    });
    this.post('/register', function (context) {
        const { email, password, rePassword } = context.params;

        if (password !== rePassword) {
            return;
        };

        UserModel.createUserWithEmailAndPassword(email, password)
            .then(res => {
                console.log(res);
                this.redirect('#/login');
            })
            .catch(err => {
                console.log(err);
            });
    });

    this.get('/login', function (context) {

        extendContext(context)
            .then(function () {
                this.partial('./templates/login.hbs');
            });
    });
    this.post('/login', function (context) {
        const { email, password } = context.params;

        UserModel.signInWithEmailAndPassword(email, password)
            .then(res => {
                console.log(res);
                saveUserData(res);
                this.redirect('#/home')
            })
            .catch(err => console.log(err));
    });

    this.get('/logout', function (context) {
        UserModel.signOut()
            .then(res => {
                console.log(res);
                clearUserData();
                this.redirect('#/home');
            })
            .catch(err => console.log(err));
    })

    // Offers routes
    this.get('/create-offer', function (context) {

        extendContext(context)
            .then(function () {
                this.partial('./templates/createOffer.hbs');
            });
    });
    this.post('/create-offer', function (context) {
        const { productName, price, imageUrl, description, brand } = context.params;

        console.log('test1');
        DB.collection('offers').add({
            productName,
            price,
            imageUrl,
            description,
            brand,
            salesman: getUserData().uid,
            clients: []
        })
            .then(res => {
                console.log(res);
                console.log('uploaded!!! :)')
                this.redirect('#/home')
            })
            .catch(err => console.log(err))

    })

    this.get('/edit-offer', function (context) {

        extendContext(context)
            .then(function () {
                this.partial('./templates/editOffer.hbs');
            });
    });

    this.get('/details/:offerId', function (context) {
        const { offerId } = context.params;

        DB.collection('offers').doc(offerId).get()
            .then(res => {
                const offerData = res.data();
                userIndex = offerData.clients.indexOf(getUserData().uid);
                const imInTheClientsList = userIndex > -1;
                const imTheSalesman = offerData.salesman === getUserData().uid
                context.offer = { ...offerData, imTheSalesman, id: offerId, imInTheClientsList }
                extendContext(context)
                    .then(function () {
                        this.partial('./templates/details.hbs');
                    });
            });
    });

    this.get('/delete/:offerId', function (context) {
        const { offerId } = context.params;
        DB.collection('offers')
            .doc(offerId)
            .delete()
            .then(res => {
                console.log(res);
                this.redirect('#/home');
            })
            .catch(err => console.log(err));
    });

    this.get('/edit/:offerId', function (context) {
        const { offerId } = context.params;

        DB.collection('offers')
            .doc(offerId)
            .get()
            .then(res => {
                console.log(res.data())
                context.offer = { id: offerId, ...res.data() };
                extendContext(context)
                    .then(function () {
                        this.partial('./templates/editOffer.hbs');
                    });
            });

    });
    this.post('edit/:offerId', function (context) {
        const { offerId, productName, price, brand, description, imageUrl } = context.params

        DB.collection('offers')
            .doc(offerId)
            .get()
            .then(response => {
                return DB.collection('offers')
                    .doc(offerId)
                    .set({
                        ...response.data(),
                        productName,
                        price,
                        brand,
                        description,
                        imageUrl
                    })
            })
            .then(res => {
                this.redirect(`#/details/${offerId}`);
            })
            .catch(err => console.log(err));
    })

    this.get('/buy/:offerId', function(context) {
        const { offerId } = context.params

        DB.collection('offers')
            .doc(offerId)
            .get()
            .then(response => {
                const offerData = { ...response.data() };
                offerData.clients.push(getUserData().uid);

                return DB.collection('offers')
                    .doc(offerId)
                    .set(offerData)
            })
            .then(res => {
                this.redirect(`#/details/${offerId}`);
            })
            .catch(err => console.log(err));
    })
});



(() => {
    app.run('#/home');
})();

function extendContext(context) {
    const user = getUserData();
    context.isLoggedIn = Boolean(user);
    context.email = user ? user.email : '';

    return context.loadPartials({
        'header': './partials/header.hbs',
        'footer': './partials/footer.hbs'
    });
};

function saveUserData(data) {
    const { user: { email, uid } } = data;

    localStorage.setItem('user', JSON.stringify({ email, uid }))
}

function getUserData() {
    let user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
}

function clearUserData() {
    this.localStorage.removeItem('user');
}