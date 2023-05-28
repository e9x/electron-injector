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
      <p>
        Before using this tool, please check out our{" "}
        <a href="https://github.com/e9x/electron-injector/tree/master#tutorials">
          Tutorials
        </a>{" "}
        page for important step-by-step guidance.
      </p>
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
      <footer style={{ marginTop: "40px" }}>
        <div className="row">
          <div className="col-lg-12">
            <ul className="list-unstyled">
              <li>
                <a href="https://github.com/e9x/electron-injector">
                  Source Code
                </a>
              </li>
            </ul>
            <p>
              Code released under the{" "}
              <a href="https://github.com/e9x/electron-injector/blob/master/LICENSE">
                GPLv3 License
              </a>
              .
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
