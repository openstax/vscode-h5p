
(function () {
	CKEDITOR.plugins.add('h5pimageupload', {
		lang: 'en', // %REMOVE_LINE_CORE%
		icons: 'h5pimageupload', // %REMOVE_LINE_CORE%
		hidpi: true, // %REMOVE_LINE_CORE%
		init: function (editor) {
			editor.addCommand('openh5pfiledialog', {
				exec: function (editor) {
					console.log('Opening file selector')
					// Create a file selector
					const input = document.createElement('input');
					input.type = 'file';
					input.setAttribute('accept', 'image/jpeg,image/png,image/gif');
					input.style = 'display:none';
					input.addEventListener('change', function () {
						// When files are selected, upload them
						const promise = (async () => {
							const formData = new FormData();
							const file = this.files[0];
							const filename = file.name;
							formData.append('file', file, filename);
							formData.append('field', JSON.stringify({ type: 'image' }));
							formData.append('contentId', H5PEditor.contentId || 0);
							const response = await fetch(
								H5PEditor.getAjaxUrl('files'), {
									method: 'POST',
									body: formData,
								},
							);
							const payload = await response.json();
							const img = editor.document.createElement('img');
							img.setAttribute(
								'src',
								H5P.getPath(payload.path, H5PEditor.contentId),
							);
							img.setAttribute(
								'data-filename',
								filename,
							);
							function setDefaultSize() {
								const aspectRatio = this.naturalWidth / this.naturalHeight;
								const width = 300;
								const height = Math.round(width / aspectRatio);
								this.setAttribute(
									'style',
									`width: ${width}px; height: ${height}px;`,
								)
								this.removeEventListener('load', setDefaultSize);
							}
							img.$.addEventListener('load', setDefaultSize);
							editor.insertElement(img);
						})();
						promise
							.catch(console.error)
							.finally(() => {
								document.body.removeChild(input);
							});
					});
				
					document.body.appendChild(input);
					// Open file selector
					input.click();
				}
			});
			editor.ui.addButton( 'H5PImageUpload', {
				label: editor.lang.h5pimageupload.upload,
				command: 'openh5pfiledialog',
				toolbar: 'insert',
			});
		}
	})
})();