declare module 'ssh2-sftp-client' {
  interface FileInfo {
    name: string;
    modifyTime?: number;
    size?: number;
  }

  interface ConnectOptions {
    host: string;
    port?: number;
    username: string;
    privateKey: string;
    passphrase?: string;
    readyTimeout?: number;
  }

  export default class SftpClient {
    connect(options: ConnectOptions): Promise<void>;
    end(): Promise<void>;
    put(input: Buffer | string, remotePath: string): Promise<string>;
    list(remotePath: string): Promise<FileInfo[]>;
    get(remotePath: string): Promise<Buffer | string>;
    delete(remotePath: string): Promise<string>;
  }
}