function handleDragOver(event) {
    event.preventDefault();
}

function handleDrop(event) {
    event.preventDefault();

    var fileInput = document.getElementById('fileInput');
    var fileInputLabel = document.getElementById('fileInputLabel');

    var files = event.dataTransfer.files;
    if (files.length > 0) {
        fileInput.files = files;
        handleFileSelect(event);
    }

    fileInputLabel.classList.remove('dragover');
}

function handleFileSelect(event) {
    var fileInputLabel = document.getElementById('fileInputLabel');
    var fileInput = document.getElementById('fileInput');

    var files = fileInput.files;
    var fileList = '';

    for (var i = 0; i < files.length; i++) {
        fileList += files[i].name + '<br>';
    }

    fileInputLabel.querySelector('div').innerHTML = fileList;
}

function uploadFile() {
    var fileInput = document.getElementById('fileInput');
    var files = fileInput.files;

    if (files.length === 0) {
        alert('Please select one or more files');
        return;
    }

    var formData = new FormData();

    for (var i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
    }

    var xhr = new XMLHttpRequest();
    xhr.open('POST', 'http://localhost:3301/upload', true);

    xhr.onload = function () {
        if (xhr.status === 200) {
            document.getElementById('status').innerHTML = 'Upload successful!';

            try {
                var jsonResponse = JSON.parse(xhr.responseText);
                console.log('Response:', jsonResponse);

                // Create and display the table
                createTable(jsonResponse);
            } catch (error) {
                console.error('Error parsing JSON response:', error);
            }
        } else {
            document.getElementById('status').innerHTML = 'Upload failed. Please try again.';
        }
    };

    xhr.upload.onprogress = function (e) {
        if (e.lengthComputable) {
            var percentage = (e.loaded / e.total) * 100;
            document.getElementById('status').innerHTML = 'Uploading: ' + percentage.toFixed(2) + '%';
        }
    };

    xhr.send(formData);
}

function createTable(files) {
    var table = '<table id="filesList" class="table">';

    // Header row
    table += '<tr><th>Filename</th><th>Download</th><th>Copy URL</th></tr>';

    // Data rows
    for (var i = 0; i < files.length; i++) {
        var file = files[i];
        var filename = file.filename;

        var downloadUrl = file.url.downloadUrl;
        var previewUrl = file.url.previewUrl;


        table += '<tr>';
        table += '<td>' + filename + '</td>';
        table += '<td><a class="btn btn-primary" href="' + downloadUrl + '" target="_blank">Download</a></td>';
        table += '<td><button class="btn btn-secondary" onclick="copyToClipboard(\'' + previewUrl + '\')">Copy URL</button></td>';
        table += '</tr>';
    }

    table += '</table>';

    // Display the table in the status div
    document.getElementById('status').innerHTML = table;
}

function copyToClipboard(url) {
    var tempInput = document.createElement('input');
    document.body.appendChild(tempInput);
    tempInput.value = url;
    tempInput.select();
    document.execCommand('copy');
    document.body.removeChild(tempInput);
    alert('Copied');
}

