import dropzoneStyles from "../dropzone.module.scss";
import { SourceType, injectScript } from "../inject";
import styles from "./SourcePicker.module.scss";
import { Editor } from "@monaco-editor/react";
import clsx from "clsx";
import type { editor } from "monaco-editor";
import prettyBytes from "pretty-bytes";
import type { MouseEventHandler } from "react";
import { useRef, useState } from "react";
import { useDropzone } from "react-dropzone";

async function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  document.documentElement.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function InjectButton({
  busy,
  pickedAsar,
  setScriptURL,
  onClick,
}: {
  busy: boolean;
  pickedAsar: boolean;
  setScriptURL?: boolean;
  onClick: MouseEventHandler<HTMLButtonElement>;
}) {
  const [mouseEnter, setMouseEnter] = useState(false);

  let tooltipMessage: string | undefined;

  if (busy) tooltipMessage = "Please wait";
  else if (!pickedAsar) tooltipMessage = "Please add an .asar file";
  else if (setScriptURL === false) tooltipMessage = "Please add a script URL";

  return (
    <>
      <div
        className="mt-2"
        style={{ display: "inline-block", position: "relative" }}
        onMouseOver={() => setMouseEnter(true)}
        onMouseLeave={() => setMouseEnter(false)}
      >
        <button
          type="button"
          className="btn btn-primary"
          disabled={typeof tooltipMessage === "string"}
          onClick={onClick}
        >
          Inject Script
        </button>
        {typeof tooltipMessage === "string" && (
          <div
            className={clsx(
              "tooltip",
              "bs-tooltip-auto",
              "fade",
              mouseEnter && "show"
            )}
            style={{
              position: "absolute",
              top: 0,
              left: "100%",
              width: "max-content",
              pointerEvents: "none",
              userSelect: "none",
            }}
            role="tooltip"
            data-popper-placement="right"
          >
            <div className="tooltip-inner">{tooltipMessage}</div>
            <div
              className="tooltip-arrow"
              style={{
                position: "absolute",
                right: "100%",
                top: 0,
                bottom: 0,
                margin: "auto",
              }}
            />
          </div>
        )}
      </div>
    </>
  );
}

export default function SourcePicker({
  selectedAsar,
}: {
  selectedAsar: File | undefined;
}) {
  const [output, setOutput] = useState<
    { blob: Blob; name: string } | undefined
  >();
  const [busy, setBusy] = useState(false);
  const [devTools, setDevTools] = useState(false);
  const [disableWebSecurity, setDisableWebSecurity] = useState(false);
  const { getRootProps, getInputProps, isFocused, isDragAccept, isDragReject } =
    useDropzone({
      accept: { "application/javascript": [".js"] },
      multiple: true,
      onDropAccepted: async (scripts) => {
        // combine all the selected scripts into one
        editorRef.current?.setValue(
          (await Promise.all(scripts.map((script) => script.text()))).join("\n")
        );
        setActiveTab(1); // go to code editor tab
      },
    });
  const [url, setURL] = useState("");
  const [code, setCode] = useState("");

  const [activeTab, setActiveTab] = useState(0);

  const editorRef = useRef<editor.IStandaloneCodeEditor>();

  const handleInject = async (type: SourceType, value: string) => {
    if (!selectedAsar) return;

    setBusy(true);

    injectScript(selectedAsar, type, value, devTools, disableWebSecurity)
      .then((blob) => {
        setOutput({
          name: selectedAsar.name,
          blob,
        });
        setActiveTab(3); // go to output tab
      })
      .finally(() => setBusy(false));
  };

  const tabs = [
    {
      title: <>Script URLs</>,
      content: (
        <>
          <div className="form-group">
            <input
              type="email"
              className="form-control"
              id="exampleInputEmail1"
              aria-describedby="scriptURLHelp"
              placeholder="https://example.com/script1.js,https://example.com/script2.js"
              onChange={(e) => setURL(e.currentTarget.value)}
            />
            <small id="scriptURLHelp" className="form-text text-muted">
              Please provide a comma-separated list of script URLs without
              spaces. Each URL should point to a JavaScript file. The files will
              be fetched and executed each time a new page is loaded in the
              Electron app.
            </small>
          </div>
          <InjectButton
            busy={busy}
            pickedAsar={selectedAsar !== undefined}
            setScriptURL={url !== ""}
            onClick={() => handleInject(SourceType.url, url)}
          />
        </>
      ),
    },
    {
      title: <>Copy & Paste JavaScript Code</>,
      content: (
        <>
          <Editor
            onMount={(e) => (editorRef.current = e)}
            height="200px"
            defaultLanguage="javascript"
            defaultValue={code}
            onChange={(value) => setCode(value || "")}
            options={{ readOnly: busy }}
          />
          <InjectButton
            busy={busy}
            pickedAsar={selectedAsar !== undefined}
            onClick={() => handleInject(SourceType.code, code)}
          />
        </>
      ),
    },
    {
      title: <>Upload JavaScript Files</>,
      content: (
        <div
          {...getRootProps({
            className: dropzoneStyles.dropzone,
            style: {
              borderColor: isDragAccept
                ? "#00e676"
                : isDragReject
                ? "#ff1744"
                : isFocused
                ? "#2196f3"
                : "#eeeeee",
            },
          })}
        >
          <input {...getInputProps()} />
          <p>
            Drag and drop your JavaScript files here or click to browse multiple
            files
          </p>
        </div>
      ),
    },
    {
      title: <>Output</>,
      content: output && (
        <>
          <p>
            <em>
              {output.name} - {prettyBytes(output.blob.size)}
            </em>
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              download(output.blob, output.name);
            }}
          >
            Download
          </button>
        </>
      ),
    },
  ];

  return (
    <>
      <div
        className="card bg-secondary mb-3 mt-2"
        style={{ overflow: "hidden" }}
      >
        <ul
          className={clsx("nav", "nav-tabs", styles.sourceNavTabs)}
          role="tablist"
        >
          {tabs.map((tab, i) => (
            <li
              className={clsx("nav-item", styles.sourceNavItem)}
              role="presentation"
              key={i}
            >
              <a
                className={clsx(
                  styles.tab,
                  "nav-link",
                  i === activeTab && "active"
                )}
                data-bs-toggle="tab"
                aria-selected="false"
                role="tab"
                onClick={() => setActiveTab(i)}
              >
                {tab.title}
              </a>
            </li>
          ))}
        </ul>
        <div className="card-body">
          <div className="tab-content">
            {tabs.map((tab, i) => (
              <div
                className={clsx(
                  "tab-pane",
                  "fade",
                  i === activeTab && ["active", "show"]
                )}
                role="tabpanel"
                key={i}
              >
                {tab.content}
              </div>
            ))}
          </div>
        </div>
      </div>
      <fieldset className="form-group">
        <legend className="mt-4">Options</legend>
        <div className="form-check">
          <label className="form-check-label">
            <input
              className="form-check-input"
              type="checkbox"
              defaultChecked={devTools}
              onChange={(e) => setDevTools(e.currentTarget.checked)}
            />
            DevTools
          </label>
        </div>
        <div className="form-check">
          <label className="form-check-label">
            <input
              className="form-check-input"
              type="checkbox"
              defaultChecked={disableWebSecurity}
              onChange={(e) => setDisableWebSecurity(e.currentTarget.checked)}
            />
            Disable WebSecurity
          </label>
        </div>
      </fieldset>
    </>
  );
}
