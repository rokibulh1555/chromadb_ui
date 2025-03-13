window.onload = function () {
    var rightPart = document.getElementById("right_part");
    rightPart.style.display = "none";
    loadCollections();

    const savedCollection = localStorage.getItem("selectedCollection");
    if (savedCollection) {
        rightPartShow(savedCollection);
    }
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
<div id="collection_live" class="">
                    <a href="#" class="" onclick="rightPartShow('${collection.name}')" class="font-medium mr-4">${collection.name}</a>
                    <form action="/delete_collection/${collection.name}" method="post" style="display:inline;">
                        <button type="submit" class="cursor-pointer"> 
 
<i class="fa-solid fa-trash-can" style="color: #e0451f;"></i></button>
                    </form>
</div>
                `;
                collectionsList.appendChild(listItem);
            });
        });
}

async function rightPartShow(collectionName) {
    localStorage.setItem("selectedCollection", collectionName);

    let rightPart = document.getElementById("right_part");


    document.querySelectorAll("#collection_live a").forEach(item => {
        // item.classList.remove("active-collection");
        item.style.color = "black";
        item.style.fontWeight = "normal"
        item.style.fontSize = "1rem"
    });


    let selectedItem = document.querySelector(`#collection_live a[onclick="rightPartShow('${collectionName}')"]`);
    if (selectedItem) {
        // selectedItem.classList.add("active-collection");
        selectedItem.style.color = "navy";
        selectedItem.style.fontWeight = "Bold"
        selectedItem.style.fontSize = "1.1rem"
    }
    console.log(selectedItem)

    let data = await fetchAllData(collectionName);
    rightPart.style.display = "block";
    rightPart.innerHTML = '';
    rightPart.innerHTML = `
                <div class="p-4">
                    <div class="p-4 border-2 border-gray-200 border-dashed rounded-lg dark:border-gray-700">
                        <div>
                            
                           
                          <div class="grid grid-cols-12 gap-12">
                            
                          
                            
                            <div class = "col-span-7 col-start-1">
                             <h2 class="text-xl mb-2">Add Document</h2>
                            <form id="addDocumentForm">
                                <input type="text" id="documentText" required placeholder="Document Text">
                                <input type="text" id="metadataInfo" required placeholder="Metadata Info">
                                <button type="submit" class="cursor-pointer text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800">Add</button>
                            </form>
</div>
                            
                            
                            <div class = "col-span-4 col-start-9">
                            <h2 class="text-xl mb-2">Upload File</h2>
                            <form id="uploadFileForm">
                                <input type="file" id="fileInput" required>
                                <button type="submit" class="cursor-pointer mt-2 text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800">Upload</button>
                            </form>
</div>
                            
                            
                        </div>

                           <input type="text" id="searchValue" placeholder="Search..." style="margin-top: -2rem">
                           <button type="submit" id="searchBtn" class="cursor-pointer text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800">Search</button>
                           <div id="docs">
                            ${drawDataWindow(data, collectionName)}
                            </div>
                            
                        </div>
                        
                        
                    </div>
                </div>
            `;

    document.getElementById("searchBtn").addEventListener("click", await search(collectionName));

    document.getElementById("uploadFileForm").addEventListener("submit", function (event) {
        event.preventDefault();
        uploadFile(collectionName);
    });

    document.getElementById("addDocumentForm").addEventListener("submit", function (event) {
        event.preventDefault();
        addDocument(collectionName);
    });


}


function addDocument(collectionName) {
    console.log("Rokib", collectionName)
    const documentText = document.getElementById("documentText").value;
    const metadataText = document.getElementById("metadataInfo").value;

    if (!documentText || !metadataText) {
        alert("Please fill in both fields.");
        return;
    }

    const formData = {}
    formData.document = documentText
    formData.metadata = metadataText

    fetch(`/add_document/${collectionName}`, {
        method: "POST",
        body: JSON.stringify(formData),
        headers: {'Content-Type': 'application/json'}

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

    console.log(data)
    return `
<div class="overflow-y-auto h-[52vh]">
<ul>

                                ${data.map(pair => {
        return `
                                    <div class="m-4 p-4 rounded bg-slate-100 dark:bg-gray-800 relative" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                    <svg onclick="deleteDocument('${collectionName}', '${pair.id}')" class="cursor-pointer absolute top-1 right-1 text-red-400 dark:text-gray-500 w-5 h-5 mb-3.5 mx-auto" aria-hidden="true" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>
            
                                        <pre>
                                        <code class="text-left overflow-hidden text-ellipsis">
                                        ${JSON.stringify(pair, null, 2)}
                                        </code>
                                        </pre>
                                    </div>
                                `
    }).join('')}
                            </ul> </div>`
}