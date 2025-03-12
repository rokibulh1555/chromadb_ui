window.onload = function () {
    var rightPart = document.getElementById("right_part");
    rightPart.style.display = "none";
    loadCollections();
};

let DATA = []

async function search(collection_name) {
    return async function () {
        console.log('dfd')
        let content = document.getElementById("docs");
        content.innerHTML = '';
        const query_value = document.getElementById("searchValue").value.trim(); // Trim spaces

        try {
            if (query_value) {
                const response = await fetch(`/search/${collection_name}?query=${encodeURIComponent(query_value)}`);
                if (!response.ok) throw new Error("Failed to fetch search results");

                let searchData = await response.json();
                content.innerHTML = drawDataWindow(searchData, collection_name);
            } else {
                const data = await fetchAllData(collection_name);
                content.innerHTML = drawDataWindow(data, collection_name);
            }
        } catch (error) {
            console.error("Search error:", error);
            content.innerHTML = `<p style="color: red;">Error fetching data. Please try again.</p>`;
        }
    };
}


function loadCollections() {
    fetch('/collection-list')
        .then(response => response.json())
        .then(data => {
            const collectionsList = document.getElementById('collections_list');
            collectionsList.innerHTML = '';

            data.collections.forEach(collection => {
                const listItem = document.createElement('li');
                listItem.innerHTML = `
                    <a href="#" onclick="rightPartShow('${collection.name}')" class="font-medium mr-4">${collection.name}</a>
                    <form action="/delete_collection/${collection.name}" method="post" style="display:inline;">
                        <button type="submit" class="cursor-pointer focus:outline-none text-white bg-red-700 hover:bg-red-800 focus:ring-4 focus:ring-red-300 font-small rounded-lg text-sm px-3 py-1.5 me-2 mb-2 dark:bg-red-600 dark:hover:bg-red-700 dark:focus:ring-red-900">Delete</button>
                    </form>
                `;
                collectionsList.appendChild(listItem);
            });
        });
}

async function rightPartShow(collectionName) {
    let rightPart = document.getElementById("right_part");
    let data = await fetchAllData(collectionName);
    rightPart.style.display = "block";
    rightPart.innerHTML = '';
    rightPart.innerHTML = `
                <div class="p-4">
                    <div class="p-4 border-2 border-gray-200 border-dashed rounded-lg dark:border-gray-700">
                        <div>
                            
                            <h2>Search Documents</h2>

                           <input type="text" id="searchValue" placeholder="Search...">
                           <button type="submit" class="cursor-pointer" id="searchBtn">Search</button>
                           <div id="docs">
                            ${drawDataWindow(data, collectionName)}
                            </div>
                        </div>
                    </div>
                </div>
            `;

    document.getElementById("searchBtn").addEventListener("click", await search(collectionName));

    // document.getElementById("uploadFileForm").addEventListener("submit", function (event) {
    //     event.preventDefault();
    //     uploadFile(data.collection_name);
    // });
    //
    // document.getElementById("addDocumentForm").addEventListener("submit", function (event) {
    //     event.preventDefault();
    //     addDocument(data.collection_name);
    // });


}


function addDocument(collectionName) {
    console.log("Rokib")
    const documentText = document.getElementById("documentText").value;
    const metadataText = document.getElementById("metadataInfo").value;

    if (!documentText || !metadataText) {
        alert("Please fill in both fields.");
        return;
    }

    const formData = new FormData();
    formData.append("document", documentText);
    formData.append("metadata", metadataText);

    fetch(`/add_document/${collectionName}`, {
        method: "POST",
        body: formData
    })
        .then(response => {
            if (response.redirected) {

                rightPartShow(collectionName);
            } else {
                return response.json();
            }
        })
        .then(data => {
            if (data) {
                alert("Document added successfully!");

                document.getElementById("documentText").value = "";
                document.getElementById("metadataIfo").value = "";

                const documentsList = document.getElementById("documents_list");
                const newItem = document.createElement("div");
                newItem.classList.add("p-4", "rounded", "bg-slate-100", "dark:bg-gray-800");
                newItem.innerHTML = `<p>${documentText}</p><p>${metadataText}</p>`;
                documentsList.appendChild(newItem);
            }
        })
        .catch(error => console.error("Error adding document:", error));
}


function uploadFile(collectionName) {
    const fileInput = document.getElementById("fileInput");
    const file = fileInput.files[0];

    if (!file) {
        alert("Please select a file to upload.");
        return;
    }

    const formData = new FormData();
    formData.append("file", file);

    fetch(`/upload_file/${collectionName}`, {
        method: "POST",
        body: formData
    })
        .then(response => {
            if (response.redirected) {

                rightPartShow(collectionName);
            } else {
                return response.json();
            }
        })
        .then(data => {
            if (data) alert("File uploaded successfully!");
            fileInput.value = "";
        })
        .catch(error => console.error("Error uploading file:", error));
}


function deleteDocument(collectionName, id) {
    fetch(`${collectionName}/documents/${id}`, {method: "DELETE"})
        .then(res => rightPartShow(collectionName))
}

async function fetchAllData(collectionName) {
    DATA = await fetch(`collection/${collectionName}`).then(res => res.json())
    return DATA
}

function drawDataWindow(data, collectionName) {
    return `<ul>
                                ${data.map(pair => {
        console.log(pair)
        return `
                                    <div class="m-4 p-4 rounded bg-slate-100 dark:bg-gray-800 relative">
                                    <svg onclick="deleteDocument('${collectionName}', '${pair.id}')" class="absolute top-1 right-1 text-red-400 dark:text-gray-500 w-5 h-5 mb-3.5 mx-auto" aria-hidden="true" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>
            
                                        <pre>
                                        <code class="text-left">
                                        ${JSON.stringify(pair, null, 2)}
                                        </code>
                                        </pre>
                                    </div>
                                `
    }).join('')}
                            </ul>`
}