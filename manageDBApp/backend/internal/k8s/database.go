package k8s

import (
	"context"
	"fmt"
	"log"
	"mcp-db/pkg/types"
	"time"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
)

var DatabaseClusterGVR = schema.GroupVersionResource{
	Group:    "apps.kubeblocks.io",
	Version:  "v1alpha1",
	Resource: "clusters",
}

var DatabaseConfigs = map[string]struct {
	Definition string
	Version    string
	Component  string
}{
	"postgresql": {
		Definition: "postgresql",
		Version:    "postgresql-%s",
		Component:  "postgresql",
	},
	"mysql": {
		Definition: "apecloud-mysql",
		Version:    "ac-mysql-%s",
		Component:  "mysql",
	},
	"redis": {
		Definition: "redis",
		Version:    "redis-%s",
		Component:  "redis",
	},
	"mongodb": {
		Definition: "mongodb",
		Version:    "mongodb-%s",
		Component:  "mongodb",
	},
}

var DefaultVersions = map[string]string{
	"postgresql": "14.8.0",
	"mysql":      "8.0.30",
	"redis":      "7.0.6",
	"mongodb":    "6.0",
}

func (c *Client) CreateDatabaseCluster(ctx context.Context, req *types.CreateDatabaseRequest) error {
	dbConfig, ok := DatabaseConfigs[req.Type]
	if !ok {
		return fmt.Errorf("unsupported database type: %s", req.Type)
	}

	version := req.Version
	if version == "" {
		if defaultVer, ok := DefaultVersions[req.Type]; ok {
			version = defaultVer
		} else {
			return fmt.Errorf("version not provided and no default available")
		}
	}

	formattedVersion := fmt.Sprintf(dbConfig.Version, version)

	if err := c.CreateServiceAccount(ctx, req.Name, req.Namespace); err != nil {
		return fmt.Errorf("failed to create ServiceAccount: %w", err)
	}
	if err := c.CreateRole(ctx, req.Name, req.Namespace); err != nil {
		return fmt.Errorf("failed to create Role: %w", err)
	}
	if err := c.CreateRoleBinding(ctx, req.Name, req.Namespace); err != nil {
		return fmt.Errorf("failed to create RoleBinding: %w", err)
	}
	//waiting the sa create.
	time.Sleep(1 * time.Second)
	cluster := &unstructured.Unstructured{
		Object: map[string]interface{}{
			"apiVersion": "apps.kubeblocks.io/v1alpha1",
			"kind":       "Cluster",
			"metadata": map[string]interface{}{
				"name":      req.Name,
				"namespace": req.Namespace,
				"finalizers": []string{
					"cluster.kubeblocks.io/finalizer",
				},
				"labels": map[string]interface{}{
					"clusterdefinition.kubeblocks.io/name": dbConfig.Definition,
					"clusterversion.kubeblocks.io/name":    formattedVersion,
					"sealos-db-provider-cr":                req.Name,
				},
			},
			"spec": map[string]interface{}{
				"affinity": map[string]interface{}{
					"nodeLabels":      map[string]interface{}{},
					"podAntiAffinity": "Preferred",
					"tenancy":         "SharedNode",
					"topologyKeys": []string{
						"kubernetes.io/hostname",
					},
				},
				"clusterDefinitionRef": dbConfig.Definition,
				"clusterVersionRef":    formattedVersion,
				"componentSpecs": []map[string]interface{}{
					{
						"componentDefRef": dbConfig.Component,
						"monitor":         true,
						"name":            dbConfig.Component,
						"replicas":        1,
						"resources": map[string]interface{}{
							"limits": map[string]interface{}{
								"cpu":    req.CPULimit,
								"memory": req.MemoryLimit,
							},
							"requests": map[string]interface{}{
								"cpu":    req.CPURequest,
								"memory": req.MemoryRequest,
							},
						},
						"serviceAccountName": req.Name,
						"switchPolicy": map[string]interface{}{
							"type": "Noop",
						},
						"volumeClaimTemplates": []map[string]interface{}{
							{
								"name": "data",
								"spec": map[string]interface{}{
									"accessModes": []string{
										"ReadWriteOnce",
									},
									"resources": map[string]interface{}{
										"requests": map[string]interface{}{
											"storage": req.Storage,
										},
									},
								},
							},
						},
					},
				},
				"terminationPolicy": "Delete",
				"tolerations":       []interface{}{},
			},
		},
	}
	_, err := c.DynamicClient.Resource(DatabaseClusterGVR).Namespace(req.Namespace).Create(ctx, cluster, metav1.CreateOptions{})
	return err
}

func (c *Client) ListDatabaseClusters(namespace string) ([]types.DBClusterInfo, error) {
	clusters, err := c.DynamicClient.Resource(DatabaseClusterGVR).Namespace(namespace).List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		return nil, err
	}
	result := make([]types.DBClusterInfo, 0)
	for _, cluster := range clusters.Items {
		metadata, found, err := unstructured.NestedMap(cluster.Object, "metadata")
		if err != nil || !found {
			log.Printf("Failed to get metadata for cluster: %v", err)
			continue
		}
		name, _ := metadata["name"].(string)
		creationTimestamp, _ := metadata["creationTimestamp"].(string)
		labels, found, _ := unstructured.NestedMap(metadata, "labels")
		if !found {
			labels = map[string]interface{}{}
		}
		definitionType, _ := labels["clusterdefinition.kubeblocks.io/name"].(string)
		versionString, _ := labels["clusterversion.kubeblocks.io/name"].(string)
		status := "Unknown"
		statusObj, found, _ := unstructured.NestedMap(cluster.Object, "status")
		if found {
			if phase, ok := statusObj["phase"].(string); ok {
				status = phase
			}
		}
		spec, found, _ := unstructured.NestedMap(cluster.Object, "spec")
		if !found {
			spec = map[string]interface{}{}
		}
		componentSpecsUntyped, found, _ := unstructured.NestedSlice(spec, "componentSpecs")
		cpuLimit := ""
		memLimit := ""
		cpuRequest := ""
		memRequest := ""
		storage := ""
		accessMode := ""
		var replicas int64 = 0
		serviceAccount := ""
		if found && len(componentSpecsUntyped) > 0 {
			mainComponent, ok := componentSpecsUntyped[0].(map[string]interface{})
			if ok {
				resources, found, _ := unstructured.NestedMap(mainComponent, "resources")
				if found {
					limits, limitsFound, _ := unstructured.NestedMap(resources, "limits")
					if limitsFound {
						if cpu, ok := limits["cpu"].(string); ok {
							cpuLimit = cpu
						}
						if mem, ok := limits["memory"].(string); ok {
							memLimit = mem
						}
					}

					requests, reqFound, _ := unstructured.NestedMap(resources, "requests")
					if reqFound {
						if cpu, ok := requests["cpu"].(string); ok {
							cpuRequest = cpu
						}
						if mem, ok := requests["memory"].(string); ok {
							memRequest = mem
						}
					}
				}

				if rep, ok := mainComponent["replicas"].(int64); ok {
					replicas = rep
				}
				if sa, ok := mainComponent["serviceAccountName"].(string); ok {
					serviceAccount = sa
				}
				volumeTemplates, found, _ := unstructured.NestedSlice(mainComponent, "volumeClaimTemplates")
				if found && len(volumeTemplates) > 0 {
					for _, volUntyped := range volumeTemplates {
						vol, ok := volUntyped.(map[string]interface{})
						if !ok {
							continue
						}
						volName, _ := vol["name"].(string)
						if volName == "data" {
							spec, specFound, _ := unstructured.NestedMap(vol, "spec")
							if specFound {
								resourcesMap, resFound, _ := unstructured.NestedMap(spec, "resources")
								if resFound {
									requestsMap, reqFound, _ := unstructured.NestedMap(resourcesMap, "requests")
									if reqFound {
										if st, ok := requestsMap["storage"].(string); ok {
											storage = st
										}
									}
								}
								accessModes, modesFound, _ := unstructured.NestedStringSlice(spec, "accessModes")
								if modesFound && len(accessModes) > 0 {
									accessMode = accessModes[0]
								}
							}
							break
						}
					}
				}
			}
		}
		clusterInfo := types.DBClusterInfo{
			Name:           name,
			Type:           definitionType,
			Version:        versionString,
			Status:         status,
			CreatedAt:      creationTimestamp,
			CPULimit:       cpuLimit,
			MemoryLimit:    memLimit,
			CPURequest:     cpuRequest,
			MemoryRequest:  memRequest,
			Storage:        storage,
			AccessMode:     accessMode,
			Replicas:       replicas,
			ServiceAccount: serviceAccount,
		}

		fmt.Println(clusterInfo)
		result = append(result, clusterInfo)
	}
	return result, nil
}

func (c *Client) DeleteDatabaseCluster(ctx context.Context, name, namespace string) error {
	return c.DynamicClient.
		Resource(DatabaseClusterGVR).
		Namespace(namespace).
		Delete(ctx, name, metav1.DeleteOptions{})
}
