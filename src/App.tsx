import SourcePicker from "./components/SourcePicker";
import dropzoneStyles from "./dropzone.module.scss";
import prettyBytes from "pretty-bytes";
import { useDropzone } from "react-dropzone";

function App() {
  const {
    getRootProps,
    getInputProps,
    acceptedFiles,
    isFocused,
    isDragAccept,
    isDragReject,
  } = useDropzone({
    multiple: false,
  });
  const selectedAsar =
    acceptedFiles.length === 1 ? acceptedFiles[0] : undefined;

  return (
    <div className="container mt-5">
      <h1>Electron Injector</h1>
      <div
        {...getRootProps({
          className: dropzoneStyles.dropzone,
          style: {
            borderColor: isDragAccept
              ? "#00e676"
              : isFocused
              ? "#2196f3"
              : isDragReject
              ? "#ff1744"
              : "#eeeeee",
          },
        })}
      >
        <input {...getInputProps()} />
        {selectedAsar ? (
          <>
            <p>
              Drag and drop another .asar file here to replace the current one
            </p>
            <em>
              {selectedAsar.name} - {prettyBytes(selectedAsar.size)}
            </em>
          </>
        ) : (
          <>
            <p>Drag and drop .asar file here or click to browse</p>
            <em>
              No .asar file selected. Please drag and drop or click to browse.
            </em>
          </>
        )}
      </div>
      <SourcePicker selectedAsar={selectedAsar} />
    </div>
  );
}

export default App;
