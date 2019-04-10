// Asynchronous Request....
const deleteProduct = (btn) => {
    // console.log(btn)
    const prodId = btn.parentNode.querySelector('[name=productId]').value;
    const csrf = btn.parentNode.querySelector('[name=_csrf]').value;
    // closest
    const productElement = btn.closest('article');

    console.log(prodId, csrf);

    // by using fetch instead of axios
    // first parameter is a set of wild card
    fetch('/admin/product/' + prodId, {
        // REST setup
        method: 'DELETE',
        headers: {
            // defined by csurf
            'csrf-token': csrf
        }
    })
    // fetch uses Promise
    .then(res => {
        /* 
            Response {type: "basic", url: "http://localhost:3000/admin/product/5c92498131bd9237946bca8b", redirected: false, status: 200, ok: true, …}
            body: (...)
            bodyUsed: false
            headers: Headers {}
            ok: true
            redirected: false
            status: 200
            statusText: "OK"
            type: "basic"
            url: "http://localhost:3000/admin/product/5c92498131bd9237946bca8b"

        */
        console.log(res);

        // change res to json message we set up in the router
        return res.json();
    })
    .then(data => {
        /* 
            {message: "Success!"}
            message: "Success!"
        */
        console.log(data);

        // remove article
        // productElement = "article"
        // parentNode = div which is <div><article></article></div>
        // removeChild('article')
        productElement.parentNode.removeChild(productElement);

    })
    .catch(err => {
        console.log(err);
    })

}