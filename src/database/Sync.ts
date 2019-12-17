import RNFS from "react-native-fs";
import RNFetchBlob, { FetchBlobResponse } from "rn-fetch-blob";
import { zip, unzip, unzipAssets, subscribe } from 'react-native-zip-archive'
import { DATABASE } from "../database/Constants";
import { database } from "../database/Database";
import { SyncResponse } from "../types/syncResponse";


export default class DatabaseSync {

  private url = 'https://demo-api.hikmahealth.org/api/sync';

  public performSync(email: string, password: string): Promise<any> {
    // const target = this.getCompressionTargetPath()
    const target = this.getLocalDBFilePath()

    // this.compressDB(this.getCompressionSourcePath(), target)

    return this.syncDB(email, password, target)
    .then((response) => {
      const responseData = JSON.parse(response.data);
      responseData.to_execute.forEach((element: SyncResponse) => {
        database.applyScript(element)
      });

    }).catch(error => {
      console.error("Database sync error!", error);
    });
  }

  private compressDB(
    sourcePath: string,
    targetPath: string
  ): Promise<void> {
    return zip(sourcePath, targetPath)
      .then((compressedPath) => {
        console.log(`zip completed at ${compressedPath}`)
      })
      .catch((error) => {
        console.log(error)
      })

  }

  private syncDB(
    email: string,
    password: string,
    localFilePath: string,
  ): Promise<FetchBlobResponse> {
    console.log(
      `Syncing DB!`
    );
    return RNFetchBlob.fetch(
      "POST",
      this.url,
      {
        "Content-Type": "multipart/form-data",
      }, [
        {
          name: 'email', data: email
        },
        {
          name: 'password', data: password,
        },
        {
          name: 'db', filename: 'AppDatabase.db', data: RNFetchBlob.wrap(localFilePath)
        }
      ]

      // RNFetchBlob.wrap(localFilePath)
    ).then(fetchBlobResponse => {
      console.log("Sync response: ", fetchBlobResponse);
      if (
        fetchBlobResponse.data &&
        fetchBlobResponse.respInfo &&
        fetchBlobResponse.respInfo.status === 200
      ) {
        console.log("Sync SUCCESS!");
        // const responseData = JSON.parse(fetchBlobResponse.data);
        return fetchBlobResponse;
        // return responseData;
      } else {
        throw new Error(
          "Sync failure! HTTP status: " +
          fetchBlobResponse.respInfo.status
        );
      }
    });
  }

  private getDatabaseName(): string {
    return DATABASE.FILE_NAME;
  }

  private getTargetPathName(): string {
    return DATABASE.COMPRESSED_FILE_NAME;
  }

  private getLocalDBFilePath(): string {
    return (
      RNFS.DocumentDirectoryPath + "/../databases/" + this.getDatabaseName()
      // "data/data/com.hikma_app/databases/" + this.getDatabaseName()
    );
  }

  private getCompressionSourcePath(): string {
    return (
      RNFS.DocumentDirectoryPath + "/databases/"
      // "Library/LocalDatabase/"
    );
  }

  private getCompressionTargetPath(): string {
    return (
      RNFS.DocumentDirectoryPath + "/databases/" + this.getTargetPathName()
      // "Library/LocalDatabase/"
    );
  }
}